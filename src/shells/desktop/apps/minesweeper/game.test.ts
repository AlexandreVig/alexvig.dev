import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  autoOpenIndexes,
  countRemainingSafe,
  cycleMark,
  initCells,
  nearIndexes,
  placeMines,
} from './game';

describe('nearIndexes', () => {
  it('returns 8 neighbors for an interior cell', () => {
    // 5x5 grid, cell (2,2) is index 12
    expect(nearIndexes(12, 5, 5)).toHaveLength(8);
  });

  it('returns 3 neighbors for a corner (top-left)', () => {
    expect(nearIndexes(0, 5, 5).sort((a, b) => a - b)).toEqual([1, 5, 6]);
  });

  it('returns 3 neighbors for a corner (bottom-right)', () => {
    expect(nearIndexes(24, 5, 5).sort((a, b) => a - b)).toEqual([18, 19, 23]);
  });

  it('returns 5 neighbors for an edge cell', () => {
    // top edge, index 2 in 5x5
    expect(nearIndexes(2, 5, 5).sort((a, b) => a - b)).toEqual([1, 3, 6, 7, 8]);
  });

  it('returns empty for out-of-range indexes', () => {
    expect(nearIndexes(-1, 5, 5)).toEqual([]);
    expect(nearIndexes(25, 5, 5)).toEqual([]);
  });
});

describe('initCells', () => {
  it('creates rows*columns cells with default state', () => {
    const cells = initCells({ rows: 9, columns: 9, mines: 10 });
    expect(cells).toHaveLength(81);
    expect(cells.every((c) => c.state === 'cover')).toBe(true);
    expect(cells.every((c) => !c.isMine)).toBe(true);
    expect(cells.every((c) => c.minesAround === 0)).toBe(true);
  });
});

describe('placeMines', () => {
  it('places exactly `mines` mines', () => {
    const cfg = CONFIG.Beginner;
    const cells = initCells(cfg);
    placeMines(cells, cfg, 40);
    expect(cells.filter((c) => c.isMine)).toHaveLength(cfg.mines);
  });

  it('never places a mine at the excluded index', () => {
    const cfg = CONFIG.Beginner;
    for (let trial = 0; trial < 20; trial++) {
      const cells = initCells(cfg);
      placeMines(cells, cfg, 40);
      expect(cells[40]!.isMine).toBe(false);
    }
  });

  it('sets correct minesAround counts on safe cells', () => {
    const cfg = { rows: 3, columns: 3, mines: 1 };
    const cells = initCells(cfg);
    placeMines(cells, cfg, 8); // exclude bottom-right
    const mine = cells.findIndex((c) => c.isMine);
    const neighbors = nearIndexes(mine, 3, 3);
    for (const n of neighbors) {
      expect(cells[n]!.minesAround).toBe(1);
    }
  });
});

describe('autoOpenIndexes', () => {
  it('flood-fills empty cells and stops at numbered cells', () => {
    const cfg = { rows: 3, columns: 3, mines: 1 };
    const cells = initCells(cfg);
    // Manually place a single mine at the top-left corner.
    cells[0]!.isMine = true;
    for (const n of nearIndexes(0, 3, 3)) cells[n]!.minesAround = 1;

    // Flooding from index 8 (opposite corner, minesAround=0) should open
    // index 8 and all frontier cells with minesAround > 0 it can reach:
    // indexes 1,2,3,5,6,7,8 (everything except the mine and its unreachable
    // neighbors — here the whole board since it's small and connected).
    const opened = autoOpenIndexes(cells, cfg, 8);
    expect(opened).toContain(8);
    expect(opened).not.toContain(0); // the mine itself is never opened
    expect(opened.length).toBeGreaterThan(1);
  });

  it('returns just the starting cell if it already has a mine count', () => {
    const cfg = { rows: 3, columns: 3, mines: 1 };
    const cells = initCells(cfg);
    cells[0]!.isMine = true;
    for (const n of nearIndexes(0, 3, 3)) cells[n]!.minesAround = 1;
    // Index 1 has minesAround=1 — flood stops immediately.
    expect(autoOpenIndexes(cells, cfg, 1)).toEqual([1]);
  });

  it('does not open flagged cells', () => {
    const cfg = { rows: 3, columns: 3, mines: 0 };
    const cells = initCells(cfg);
    cells[4]!.state = 'flag';
    const opened = autoOpenIndexes(cells, cfg, 0);
    expect(opened).not.toContain(4);
  });
});

describe('countRemainingSafe', () => {
  it('counts unopened non-mine cells', () => {
    const cfg = CONFIG.Beginner;
    const cells = initCells(cfg);
    placeMines(cells, cfg, 0);
    expect(countRemainingSafe(cells)).toBe(cfg.rows * cfg.columns - cfg.mines);
  });

  it('decreases as safe cells are opened', () => {
    const cfg = CONFIG.Beginner;
    const cells = initCells(cfg);
    placeMines(cells, cfg, 0);
    const initial = countRemainingSafe(cells);
    const safeIdx = cells.findIndex((c) => !c.isMine);
    cells[safeIdx]!.state = 'open';
    expect(countRemainingSafe(cells)).toBe(initial - 1);
  });
});

describe('cycleMark', () => {
  it('cycles cover → flag → unknown → cover', () => {
    expect(cycleMark('cover')).toBe('flag');
    expect(cycleMark('flag')).toBe('unknown');
    expect(cycleMark('unknown')).toBe('cover');
  });

  it('leaves other states untouched', () => {
    expect(cycleMark('open')).toBe('open');
    expect(cycleMark('mine')).toBe('mine');
  });
});
