#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DEFAULT_QUALITY = 80;

function parseArgs(argv) {
  const args = {
    roots: [],
    quality: DEFAULT_QUALITY,
    lossless: false,
    force: false,
    replace: false,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;

    if (a === '--help' || a === '-h') {
      args.help = true;
      continue;
    }

    if (a === '--lossless') {
      args.lossless = true;
      continue;
    }

    if (a === '--force') {
      args.force = true;
      continue;
    }

    if (a === '--replace') {
      args.replace = true;
      continue;
    }

    if (a === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (a === '--quality' || a === '-q') {
      const raw = argv[i + 1];
      i++;
      const q = Number(raw);
      if (!Number.isFinite(q) || q < 1 || q > 100) {
        throw new Error(`Invalid --quality value: ${raw}. Expected 1-100.`);
      }
      args.quality = q;
      continue;
    }

    if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    }

    args.roots.push(a);
  }

  return args;
}

function usage() {
  return `PNG → WebP converter

Usage:
  node scripts/convert-png-to-webp.mjs [roots...] [options]

Defaults:
  - roots: public extracted_assets (if they exist)
  - quality: ${DEFAULT_QUALITY}

Options:
  -q, --quality <1-100>  WebP quality (lossy) (default: ${DEFAULT_QUALITY})
  --lossless             Use lossless WebP
  --force                Overwrite existing .webp outputs
  --replace              Delete original .png after successful conversion
  --dry-run              Print what would happen without writing files
  -h, --help             Show this help

Examples:
  node scripts/convert-png-to-webp.mjs
  node scripts/convert-png-to-webp.mjs public
  node scripts/convert-png-to-webp.mjs public extracted_assets --lossless --force
`;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro']);

async function* walkFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkFiles(full);
      continue;
    }

    if (entry.isFile()) yield full;
  }
}

function isPngFile(filePath) {
  return filePath.toLowerCase().endsWith('.png');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const cwd = process.cwd();

  let roots = args.roots.length ? args.roots : ['public', 'extracted_assets'];
  roots = roots.map((r) => path.resolve(cwd, r));
  roots = (await Promise.all(roots.map(async (r) => ((await pathExists(r)) ? r : null)))).filter(
    Boolean,
  );

  if (roots.length === 0) {
    throw new Error(
      'No roots found. Pass one or more directories (e.g. `public`) or ensure `public/` exists.',
    );
  }

  let scanned = 0;
  let pngCount = 0;
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const root of roots) {
    for await (const file of walkFiles(root)) {
      scanned++;
      if (!isPngFile(file)) continue;
      pngCount++;

      const outPath = file.slice(0, -4) + '.webp';

      if (!args.force && (await pathExists(outPath))) {
        skipped++;
        continue;
      }

      if (args.dryRun) {
        converted++;
        continue;
      }

      try {
        const webpOptions = args.lossless
          ? { lossless: true }
          : {
              quality: args.quality,
            };

        await sharp(file).webp(webpOptions).toFile(outPath);

        if (args.replace) {
          await fs.unlink(file);
        }

        converted++;
      } catch (err) {
        failed++;
        console.error(`[convert] Failed: ${path.relative(cwd, file)}`);
        console.error(err);
      }
    }
  }

  const summary = {
    roots: roots.map((r) => path.relative(cwd, r) || '.'),
    scanned,
    pngCount,
    converted,
    skipped,
    failed,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (failed > 0) process.exitCode = 1;
}

await main();
