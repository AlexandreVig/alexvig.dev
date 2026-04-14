# Computer Portfolio — Developer Documentation

A dual-shell portfolio built with Astro. The page ships two independent UIs
that share the same Markdown content:

- **Desktop shell** — a Windows XP–themed environment with a window manager,
  taskbar, start menu, and a small set of apps (Notepad, Explorer, Adobe
  Reader, Outlook Express, Minesweeper, …).
- **iPod shell** — an iPod Touch 1G / iOS 1 mobile environment with a status
  bar, home-screen icon grid, dock, and slide-up app frames.

A synchronous script in `<head>` picks one shell based on the viewport and
pointer type, a CSS rule hides the loser instantly (no FOUC), and a module
script then deletes the loser's DOM and dynamic-imports only the winning
shell's bootstrap. Each shell is a full Vite chunk tree of its own — mobile
visitors never download the desktop code, and vice-versa.

---

## Table of contents

1. [Mental model](#mental-model)
2. [Project structure](#project-structure)
3. [Shell selection](#shell-selection)
4. [`src/core/` — shell-agnostic contracts](#srccore--shell-agnostic-contracts)
5. [`src/i18n/` — typed translations](#srci18n--typed-translations)
6. [Desktop shell](#desktop-shell)
   - [Virtual file system](#virtual-file-system)
   - [Shell launcher & file types](#shell-launcher--file-types)
   - [Window manager](#window-manager)
   - [App host and app types](#app-host-and-app-types)
   - [Shared menu bar](#shared-menu-bar)
   - [Apps](#desktop-apps)
   - [Clippy](#clippy)
7. [iPod shell](#ipod-shell)
8. [Astro layer and event bus](#astro-layer-and-event-bus)
9. [Styling](#styling)
10. [Tooling & tests](#tooling--tests)
11. [Recipes](#recipes)
    - [Add a markdown file](#add-a-markdown-file)
    - [Add a folder or desktop shortcut](#add-a-folder-or-desktop-shortcut)
    - [Add a file type](#add-a-file-type)
    - [Add a desktop app](#add-a-desktop-app)
    - [Add an iPod app](#add-an-ipod-app)
    - [Add a translation key](#add-a-translation-key)
12. [Architectural principles](#architectural-principles)

---

## Mental model

Each shell is organized like the real OS it imitates:

- **Content** is markdown in `src/content/` (and `src/content/fr/` for the
  French locale). Content does not belong to either shell.
- **`src/core/`** defines the minimum, shell-agnostic contracts: `BaseAppModule`,
  `BaseAppMountContext`, `BaseAppInstance`, `BaseAppManifest`, `BaseAppHostAPI`,
  plus tiny utilities (`html.ts`). Nothing in `core/` imports from a shell.
- **Each shell in `src/shells/<shell>/`** extends those base types and owns its
  own runtime: app host (or navigator), registry, window/frame chrome,
  components, and CSS.
- **Apps** are small TypeScript modules receiving a mount context (a DOM
  element, a host API, an abort signal, sometimes a `FileHandle`). They never
  reach outside their `root`.

The desktop shell adds a **virtual file system (VFS)**, a **shell launcher**
that resolves paths + file types, and a **window manager** that owns geometry
and focus. The iPod shell skips all of that: there's no filesystem, a single
linear navigator stack replaces the window manager, and every app is
fullscreen.

Extension points:

1. **Add content** → drop a markdown file in `src/content/` and reference it
   from `src/shells/desktop/fs/tree.ts`.
2. **Add a file type** → one line in `src/shells/desktop/lib/fileTypes.ts`.
3. **Add a desktop app** → create `src/shells/desktop/apps/<id>/index.ts`
   exporting an `AppModule` and register it in `apps/registry.ts`.
4. **Add an iPod app** → create `src/shells/ipod/apps/<id>/index.ts` and
   register it in `ipod/apps/registry.ts` with a `location` (`home` or `dock`).

---

## Project structure

```
computer-portfolio/
├── public/
│   ├── icons/             # XP icons (apps, files, chrome)
│   ├── ipod/              # iOS 1 app icons + assets
│   ├── cursors/           # Custom XP cursors
│   └── pdf/               # PDF assets for Adobe Reader
├── src/
│   ├── content/           # Markdown content (shared by both shells)
│   │   ├── about.md
│   │   ├── contact.md
│   │   ├── skills.md
│   │   ├── projects/
│   │   └── fr/            # French translations of the same files
│   ├── core/              # Shell-agnostic base types and utilities
│   │   ├── types.ts       # BaseAppModule / BaseAppMountContext / ...
│   │   └── html.ts        # escapeHtml / escapeAttr
│   ├── i18n/              # Typed translations
│   │   ├── en.ts          # Source of truth — `I18nKey = keyof typeof en`
│   │   ├── fr.ts
│   │   ├── index.ts       # getLocale / setLocale / t
│   │   └── index.test.ts  # Parity + interpolation tests
│   ├── layouts/
│   │   └── BaseLayout.astro  # <html>, locale + shell detection
│   ├── pages/
│   │   ├── index.astro    # Mounts both shells, chooser picks one
│   │   └── api/
│   │       └── contact.ts # Cloudflare Worker endpoint for Outlook compose
│   └── shells/
│       ├── desktop/       # Windows XP shell
│       │   ├── DesktopShell.astro
│       │   ├── bootstrap.ts       # mount() entry — called by index.astro
│       │   ├── apps/
│       │   │   ├── host.ts        # Instance map, lifecycle, mount context
│       │   │   ├── registry.ts    # AppManifest[]
│       │   │   ├── types.ts       # Desktop AppModule / AppMountContext / ...
│       │   │   ├── about/         # Reusable "About <app>" dialog
│       │   │   ├── adobe-reader/  # PDF viewer (pdfjs-dist)
│       │   │   ├── bsod/          # Fake BSOD for .exe files
│       │   │   ├── explorer/      # File navigator (history, addressBar, …)
│       │   │   ├── minesweeper/   # Game (game.ts pure logic + game.test.ts)
│       │   │   ├── notepad/       # Markdown viewer (lazy-imports marked)
│       │   │   ├── outlook/       # Outlook Express inbox/reader
│       │   │   └── outlook-compose/ # New-mail composer (multi-instance)
│       │   ├── components/        # Astro: Desktop, DesktopIcon, Taskbar, StartMenu
│       │   ├── fs/                # VFS (moved out of shared top level)
│       │   │   ├── api.ts         # resolve / listChildren / readFile / …
│       │   │   ├── api.test.ts
│       │   │   ├── tree.ts        # Declarative VFS root
│       │   │   └── types.ts       # FsNode / FileHandle / DesktopPosition
│       │   ├── lib/
│       │   │   ├── windowManager.ts  # Singleton: create/destroy/focus/…
│       │   │   ├── windowDom.ts      # Imperative window DOM builder
│       │   │   ├── types.ts          # CreateWindowOptions / WindowState
│       │   │   ├── launcher.ts       # shell.launch({ appId?, path?, args? })
│       │   │   ├── fileTypes.ts      # Extension → default app ID
│       │   │   ├── menubar.ts        # Shared XP menu-bar component
│       │   │   └── clippy/           # Clippy assistant (engine, animations, movement)
│       │   └── styles/               # XP theme CSS (variables, window, taskbar, …)
│       │       ├── variables.css
│       │       ├── window.css
│       │       ├── menubar.css       # Shared .xp-menubar dropdown styles
│       │       └── …
│       └── ipod/          # iPod Touch 1G / iOS 1 shell
│           ├── IpodShell.astro
│           ├── bootstrap.ts          # mount() entry
│           ├── apps/
│           │   ├── registry.ts       # IpodAppManifest[]
│           │   ├── types.ts          # IpodAppModule / IpodAppMountContext
│           │   ├── safari/ mail/ notes/ music/ calculator/ decorative/
│           ├── components/           # StatusBar, HomeScreen, IconGrid, Dock, AppIcon
│           ├── lib/
│           │   ├── navigator.ts      # Singleton nav stack (home ↔ app)
│           │   ├── appFrame.ts       # Fullscreen <section> with slide in/out
│           │   ├── ipod-host.ts      # IpodAppHostAPI factory
│           │   └── markdown.ts       # Shared markdown renderer for Notes/Mail
│           └── styles/global.css
├── astro.config.mjs
├── tsconfig.json           # extends strict + noUncheckedIndexedAccess
├── eslint.config.js        # flat config (@typescript-eslint)
├── .prettierrc.json
├── package.json            # scripts: dev/build/test/format/lint
└── wrangler.jsonc          # Cloudflare Pages config
```

---

## Shell selection

Shell selection is a three-stage handshake, all driven from `BaseLayout.astro`
and `src/pages/index.astro`:

1. **Inline synchronous script in `<head>`** (`BaseLayout.astro`): matches
   `(max-width: 768px)` or `(pointer: coarse) + innerWidth < 1024` and sets
   `html[data-shell="desktop"|"ipod"]` before the body paints.
2. **Inline `<style is:global>`** (`BaseLayout.astro`):
   `html[data-shell='desktop'] #ipod-shell { display: none !important; }` and
   the symmetric rule — hides the losing shell on the very first frame, so
   there is no FOUC regardless of which shell wins.
3. **Module script in `index.astro`**: reads the same dataset attribute,
   removes the losing shell's DOM node entirely, then does
   `await import('../shells/<winner>/bootstrap')` and calls `mount()`. The
   losing shell's JS is never fetched.

Both shells are SSR'd by Astro at build time — the desktop-shell Astro
components and the iPod-shell Astro components are rendered into the same
HTML document. Only one ends up running code.

Changing the breakpoint: edit both the synchronous script in `BaseLayout.astro`
_and_ the matching comment in `index.astro` (keep them in sync).

---

## `src/core/` — shell-agnostic contracts

`src/core/types.ts` defines the base contracts every shell implements:

```ts
export interface BaseAppHostAPI {
  setTitle(title: string): void;
  setIcon(icon: string): void;
  close(): void;
}

export interface BaseAppMountContext<Host extends BaseAppHostAPI = BaseAppHostAPI> {
  root: HTMLElement;
  instanceId: string;
  args: Record<string, unknown>;
  signal: AbortSignal;
  host: Host;
}

export interface BaseAppInstance {
  unmount?(): void;
}

export interface BaseAppModule<
  Ctx extends BaseAppMountContext = BaseAppMountContext,
  Inst extends BaseAppInstance = BaseAppInstance,
> {
  mount(ctx: Ctx): Inst | void | Promise<Inst | void>;
}

export interface BaseAppManifest<Mod extends BaseAppModule = BaseAppModule> {
  id: string;
  title: string;
  loader: () => Promise<{ default: Mod }>;
}
```

Each shell extends these. The desktop shell adds `file: FileHandle | null` to
the mount context, `setSize(w, h)` to the host API, resize/focus/minimize
lifecycle hooks on the instance, and window chrome fields on the manifest.
The iPod shell currently uses the base types verbatim, but re-exports them as
`IpodAppHostAPI`, `IpodAppMountContext`, etc. so apps have one stable import
site.

`src/core/html.ts` exports `escapeHtml` / `escapeAttr` — the one tiny utility
that both shells _and_ the Cloudflare contact API all need. Kept in `core/`
because it has zero dependencies on anything else.

**Rule**: nothing inside `core/` may import from a shell. Shells import from
`core/`, not the other way around.

---

## `src/i18n/` — typed translations

English is the source of truth. The key type is derived from the `en` object:

```ts
// src/i18n/en.ts
const en = {
  'explorer.empty': 'This folder is empty.',
  'explorer.items.one': '{0} item',
  'explorer.items.other': '{0} items',
  // …
} as const;

export type I18nKey = keyof typeof en;
```

`src/i18n/index.ts` exports:

- `getLocale(): 'en' | 'fr'` — reads `localStorage['xp-locale']`, else the
  browser language, else `'en'`. Memoized.
- `setLocale(locale)` — writes the key and reloads.
- `t(key: I18nKey, ...args): string` — looks up the current locale's string,
  falls back to English, falls back to the key itself. Supports `{0}`, `{1}`
  interpolation.

`index.test.ts` covers interpolation, key fallback, and (critically) **en/fr
key parity** — the test fails if either file drifts away from the other.

Both shells use `t()` at runtime. The iPod shell also uses a `data-i18n`
attribute on SSR'd home-screen labels that `bootstrap.ts` patches on mount
(so the Astro-rendered English fallbacks get replaced with the live locale
before the user sees them).

---

## Desktop shell

Layered architecture:

```
  User action (icon double-click, start menu, explorer nav, taskbar)
         │ xp:launch CustomEvent
         ▼
  ┌────────────────────────────────────────────────────────────┐
  │  shells/desktop/lib/launcher.ts                            │
  │  launch({ appId?, path?, args? })                          │
  │  - if path → VFS resolve                                   │
  │  - file → FileHandle + file-type registry → default app    │
  │  - folder/unresolved + appId → forward path via args       │
  └────────────────────────────────────────────────────────────┘
         │ { appId, file, args }
         ▼
  ┌────────────────────────────────────────────────────────────┐
  │  shells/desktop/apps/host.ts                               │
  │  - manifest.findExistingInstance?(args) → focus + bail     │
  │  - computeInstanceId by kind (singleton/document/multi)    │
  │  - dedupe or lazy-load module                              │
  │  - windowManager.create() → .window-body                   │
  │  - build AppHostAPI + AbortController + AppMountContext    │
  │  - await module.default.mount(ctx)                         │
  │  - ResizeObserver forwards to instance.onResize            │
  └────────────────────────────────────────────────────────────┘
         │ mount(ctx)              │ create/destroy/focus/…
         ▼                         ▼
  ┌──────────────────────┐  ┌────────────────────────────────┐
  │  apps/<id>/index.ts  │  │  lib/windowManager.ts          │
  │  Your app code.      │  │  - Map<id, WindowState>        │
  │  root / file / args  │  │  - drag, resize, focus, z      │
  │  / host / signal.    │  │  - xp:taskbar-update events    │
  └──────────────────────┘  │   ┌ lib/windowDom.ts ┐         │
                            │   │ createWindow…    │         │
                            │   └──────────────────┘         │
                            └────────────────────────────────┘
```

| Layer                  | Knows about                     | Doesn't know about             |
| ---------------------- | ------------------------------- | ------------------------------ |
| `fs/`                  | Folders, files, content loading | Apps, windows, events          |
| `lib/launcher.ts`      | File types, app IDs, VFS        | Window chrome, DOM             |
| `lib/fileTypes.ts`     | Extension → default `appId`     | VFS paths, apps                |
| `lib/windowManager.ts` | Window DOM, geometry, drag, z   | Apps, file types, shell events |
| `apps/host.ts`         | Apps, lifecycle, instance map   | Geometry, markdown, explorer   |
| `apps/<id>/`           | Its own content and UI          | Other apps, window chrome      |
| `components/*.astro`   | SSR of the static shell surface | Runtime app state              |

### Virtual file system

**`shells/desktop/fs/types.ts`**:

```ts
export type FsNode = FolderNode | FileNode | ShortcutNode;

export interface DesktopPosition {
  row: number;
  col: number;
} // 1-based

export interface FolderNode {
  kind: 'folder';
  name: string;
  icon?: string;
  children: FsNode[];
  desktopPosition?: DesktopPosition;
}

export interface FileNode {
  kind: 'file';
  name: string;
  icon?: string;
  ext: string; // ".md"
  load: () => Promise<string>; // lazy — one Vite chunk per file
  desktopPosition?: DesktopPosition;
}

export interface ShortcutNode {
  kind: 'shortcut';
  name: string;
  icon?: string;
  target: { appId: string; path?: string };
  desktopPosition?: DesktopPosition;
  displayShortcutArrow?: boolean;
}

export interface FileHandle {
  path: string;
  name: string;
  ext: string;
  icon: string;
  read(): Promise<string>; // memoized per handle
}
```

**`fs/tree.ts`** is the declarative VFS root. File `load` functions use Vite's
`?raw` dynamic imports so each markdown file ships as its own chunk, and the
French translations are picked at read time via `getLocale()`:

```ts
load: () =>
  getLocale() === 'fr'
    ? import('../../../content/fr/about.md?raw').then((m) => m.default)
    : import('../../../content/about.md?raw').then((m) => m.default),
```

**`fs/api.ts`** exposes pure functions over the tree:

| Function              | Returns                       | Used by              |
| --------------------- | ----------------------------- | -------------------- |
| `resolve(path)`       | `FsNode \| null`              | launcher, explorer   |
| `listChildren(path)`  | `FsNode[]`                    | explorer             |
| `readFile(path)`      | `Promise<FileHandle \| null>` | launcher             |
| `parentPath(path)`    | `string`                      | explorer "Up" button |
| `joinPath(parent, n)` | `string`                      | explorer, desktop    |
| `iconForNode(node)`   | `string`                      | desktop, explorer    |
| `desktopNodes()`      | `FsNode[]`                    | `Desktop.astro`      |

`api.test.ts` covers `resolve`, `parentPath`, `joinPath`, and `listChildren`.

### Shell launcher & file types

**`lib/launcher.ts`** is the single entry point for "open something":

```ts
export async function launch(req: {
  appId?: string;
  path?: string;
  args?: Record<string, unknown>;
}): Promise<void>;
```

Resolution rules:

1. If `path` is given:
   - Resolves to a **file** → load into a `FileHandle`.
   - Resolves to a **folder** (or anything else) with an explicit `appId` →
     forward the path via `args.path` (so Explorer can use it as a start
     directory).
   - Otherwise → `console.warn` and bail.
2. If `appId` is not explicit, fall back to the file's default from the
   file-type registry.
3. Call `appHost.launch({ appId, file, args })`.

All UI surfaces route through here via `xp:launch` CustomEvents — never call
`appHost.launch` directly from UI code.

**`lib/fileTypes.ts`** is a flat `Record<string, FileTypeDef>`:

```ts
'.md':  { ext: '.md',  icon: '/icons/notepad.png',    defaultAppId: 'notepad',      displayName: 'Markdown Document' },
'.txt': { ext: '.txt', icon: '/icons/notepad.png',    defaultAppId: 'notepad',      displayName: 'Text Document' },
'.pdf': { ext: '.pdf', icon: '/icons/pdf-file.png',   defaultAppId: 'adobe-reader', displayName: 'PDF Document' },
'.exe': { ext: '.exe', icon: '/icons/notepad.png',    defaultAppId: 'bsod',         displayName: 'Application' },
```

`getFileType(ext)` returns the entry or a Notepad fallback.

### Window manager

**`lib/types.ts`**:

```ts
export type WindowControl = 'minimize' | 'maximize' | 'close';

export interface CreateWindowOptions {
  instanceId: string;
  title: string;
  icon: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  controls?: WindowControl[]; // default: ['minimize','maximize','close']
  showIcon?: boolean; // default: true — title-bar icon
  resizable?: boolean; // default: true — edge resize + maximize
  showInTaskbar?: boolean; // default: true
}

export interface WindowState {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  openedAt?: number;
  resizable: boolean;
  showInTaskbar: boolean;
}
```

**`lib/windowDom.ts::createWindowElement(opts)`** imperatively builds the DOM
for one window:

```
.window[data-window-id][data-resizable]
├── .header__bg
├── .title-bar
│   ├── img.title-bar-icon                (omitted if !showIcon)
│   ├── .title-bar-text
│   └── .title-bar-controls
│       ├── button[data-action="minimize"]
│       ├── button[data-action="maximize"]
│       └── button[data-action="close"]   (subset per opts.controls)
└── .window-body                           ← app mounts here
```

**`lib/windowManager.ts`** is the singleton `WindowManager` class. Public API:

| Method                               | Effect                                                                |
| ------------------------------------ | --------------------------------------------------------------------- |
| `create(opts): HTMLElement`          | Builds + appends the window, wires drag/resize, focuses, returns body |
| `destroy(id)`                        | Removes the DOM node and deletes state                                |
| `has(id)`                            | Is this instance id tracked?                                          |
| `focus(id)`                          | Raises z-index, toggles focus classes, emits `xp:taskbar-update`      |
| `minimize(id)` / `restore(id)`       | Hides/shows and updates taskbar                                       |
| `maximize(id)`                       | Toggles `.is-maximized` (guarded by `resizable`)                      |
| `setTitle(id, t)` / `setIcon(id, i)` | Mutate chrome                                                         |
| `setSize(id, w, h)`                  | Programmatic resize (e.g. Minesweeper fit-to-content)                 |
| `getState(id)` / `getAllStates()`    | State introspection                                                   |

Internals: `setupInteraction` wires mouse drag (title bar) and edge resize
with a cursor cover div during interactions — the only code that mutates
inline `transform`/`width`/`height` during drag. `applyState()` is the
authoritative sync at rest. Cascading: windows auto-cascade
(`CASCADE_BASE_X`/`Y` + `CASCADE_STEP`) unless `x`/`y` are explicit.
`syncTaskbar()` dispatches `xp:taskbar-update` with `{ windows, focusedId }`;
the taskbar component listens and rebuilds its buttons.

The window manager does **not** know about apps. It is told to `create` and
`destroy` by the app host.

### App host and app types

**`apps/types.ts`** extends the base contracts:

```ts
export type AppKind = 'singleton' | 'document' | 'multi';

export interface AppHostAPI extends BaseAppHostAPI {
  setSize(width: number, height: number): void;
}

export interface AppMountContext extends BaseAppMountContext<AppHostAPI> {
  file: FileHandle | null; // present for document apps
}

export interface AppInstance extends BaseAppInstance {
  onResize?(width: number, height: number): void;
  onFocus?(): void;
  onBlur?(): void;
  onMinimize?(): void;
  onRestore?(): void;
  onLaunchArgs?(args: Record<string, unknown>): void;
}

export interface AppModule extends BaseAppModule<AppMountContext, AppInstance> {}

export interface AppManifest extends BaseAppManifest<AppModule> {
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  kind: AppKind;
  acceptsFileTypes?: string[];
  showInStartMenu?: boolean;
  controls?: WindowControl[];
  showWindowIcon?: boolean;
  resizable?: boolean;
  showInTaskbar?: boolean;
  /**
   * Optional manifest-level dedup hook. Given the launch args, return the
   * instance ID of an already-open window to focus, or null to fall through
   * to the normal kind-based keying. Used by `multi` apps that need to
   * dedupe on live runtime state — Explorer matches by *current* folder.
   */
  findExistingInstance?(args: Record<string, unknown>): string | null;
}
```

**App kinds** drive instance IDs:

| Kind        | Instance ID                              | On relaunch                          |
| ----------- | ---------------------------------------- | ------------------------------------ |
| `singleton` | `<appId>`                                | Focus existing, never a new window   |
| `document`  | `<appId>:<file.path or args.path or "">` | Focus existing if same key; else new |
| `multi`     | `<appId>#<++counter>` (always unique)    | Every launch spawns a new window     |

`multi + findExistingInstance` is how Explorer works: every launch _would_ be
a new window, except the manifest's `findExplorerInstanceAt(path)` hook
checks every live Explorer for its current folder and returns the matching
instance ID. The host focuses that one instead. Users can still open two
Explorers on two different folders; opening the same folder twice focuses
the first.

**`apps/host.ts`** owns `Map<instanceId, MountedEntry>`. On launch:

1. Look up the manifest by `appId`.
2. Try `manifest.findExistingInstance?(args)` — if it returns an ID the host
   is already tracking, focus and bail.
3. Compute `instanceId` by kind.
4. If that instance is already mounted → `focusExisting()` restores + forwards
   `onLaunchArgs`; bail.
5. If a loader is in flight for that ID → debounce and ignore.
6. Dispatch `xp:app-launch` (so Clippy can react).
7. `await manifest.loader()`.
8. `windowManager.create({...})` with all the chrome flags forwarded.
9. Build `AbortController`, `AppHostAPI` (`setTitle`/`setIcon`/`setSize`/`close`),
   and `AppMountContext`, call `module.default.mount(ctx)`.
10. Attach a `ResizeObserver` on the body — forwards width/height to
    `instance.onResize`.
11. Store the entry.

**Chrome icon precedence** during mount: `args.icon > file.icon > manifest.icon`.
This is why the About dialog (templated, one module) can adopt its parent
app's icon via `args`.

Lifecycle events: `xp:close` → `unmount()`, abort the signal (so every listener
attached with `{ signal }` auto-detaches), disconnect the ResizeObserver,
`windowManager.destroy(id)`. `xp:minimize` / `xp:restore` forward to the
instance hooks. `xp:taskbar-update` is diffed against each entry's previous
focus state so `onFocus`/`onBlur` fire only on transitions.

Every host call into an app is wrapped in `try/catch` so one buggy app can't
break the host.

### Shared menu bar

`lib/menubar.ts` + `styles/menubar.css` expose one reusable XP-style dropdown
menu bar used by every desktop app that has a menu:

```ts
export interface MenuBarOptions {
  schema: MenuSchema; // Record<label, MenuItem[]>
  onAction: (action: string) => void;
  isChecked?: (action: string) => boolean; // checkmark rows (Minesweeper diff)
  logo?: { src: string; alt?: string }; // optional right-aligned logo (Explorer)
}

export function createMenuBar(opts: MenuBarOptions, signal: AbortSignal): HTMLElement;
```

Each app's `menu.ts` defines a typed `MenuSchema`, builds the bar, and wires
its `onAction` to local handlers. Hover-to-switch, outside-click and Escape
dismissal, and all listener teardown are handled by `createMenuBar` via the
passed `AbortSignal`. CSS lives in `styles/menubar.css` as the `.xp-menubar`
/ `.xp-menubar-dropdown-*` classes — no per-app menu CSS left.

### Desktop apps

Registered in `apps/registry.ts`:

| ID                | Kind      | File types    | Notes                                                                               |
| ----------------- | --------- | ------------- | ----------------------------------------------------------------------------------- |
| `explorer`        | multi     | —             | `findExistingInstance` dedupes by live folder; shows Windows logo in menu           |
| `notepad`         | document  | `.md`, `.txt` | Lazy-imports `marked`; renders to `.window-body`                                    |
| `about`           | document  | —             | Reusable About-<app> dialog; `controls: ['close']`, not resizable, not in taskbar   |
| `outlook-express` | singleton | —             | Fake inbox + reading pane                                                           |
| `outlook-compose` | multi     | —             | New-mail composer; posts to `/api/contact` Cloudflare Worker                        |
| `adobe-reader`    | document  | `.pdf`        | Uses `pdfjs-dist`; `IntersectionObserver` for lazy page render                      |
| `bsod`            | multi     | `.exe`        | No title bar, not in taskbar — pretends the system crashed                          |
| `minesweeper`     | singleton | —             | `game.ts` pure logic (unit-tested), `digits.ts` seven-seg rendering, `index.ts` DOM |

Each app lives in its own folder: `index.ts` (entry), `menu.ts` (menu schema
for the shared menubar), a per-app `.css`, plus helpers (`render.ts`,
`highlight.ts`, `history.ts`, `addressBar.ts`, `instances.ts`, …) as needed.

**`apps/about/launch.ts`** exports `openAbout(parentAppId, fields)` — every
app calls this to open its "About" dialog so there's one call site instead
of a repeated `launch({ appId: 'about', ... })` block per app.

### Clippy

`lib/clippy/` is a small animated assistant overlay:

- `animations.ts` — sprite-sheet animation table with preloaded frames.
- `engine.ts` — plays and sequences animations, locks during scripted sequences.
- `movement.ts` — idle drift + gravitate-towards-focused-window behaviour.
- `clippy.ts` — `initClippy()` wires the runtime: subscribes to `xp:app-launch`,
  `xp:close`, `xp:focus`, `xp:maximize`, `xp:game-win`, `xp:game-lose`, and
  plays matching animations. Idempotent — safe under HMR.

Clippy is mounted once from `bootstrap.ts` and listens to the event bus only;
it never reaches into app DOM.

---

## iPod shell

The iPod shell is a radically simpler environment:

- **One visible screen at a time.** No windows, no z-index, no cascade.
- **A linear navigation stack** (`home ↔ app`) instead of a window manager.
- **No filesystem.** Apps get raw launch args only.
- **Fullscreen apps** with a nav-bar back button.

### Components

Astro components under `shells/ipod/components/`:

- `StatusBar.astro` — top bar with clock (wired by `bootstrap.ts::startClock`),
  carrier, battery. Clock aligns to wall-clock minute and auto-localizes (12h
  in English, 24h in French).
- `HomeScreen.astro` — the icon grid + dock container.
- `IconGrid.astro` — renders `ipodApps.filter(a => a.location === 'home')`
  sorted by `order`. Every icon has `data-app-id` and `data-i18n`; the
  bootstrap's `patchI18n` walks these after mount.
- `Dock.astro` — same thing for `location === 'dock'`.
- `AppIcon.astro` — one icon tile.

### Apps

`shells/ipod/apps/types.ts`:

```ts
export type IpodAppHostAPI = BaseAppHostAPI;
export type IpodAppMountContext = BaseAppMountContext<IpodAppHostAPI>;
export type IpodAppInstance = BaseAppInstance;

export interface IpodAppManifest extends BaseAppManifest<IpodAppModule> {
  icon: string; // 57x57 iOS 1 PNG
  location: 'home' | 'dock';
  order: number;
  titleKey?: I18nKey; // live-translated title
}
```

Registry (`apps/registry.ts`) — 4 dock apps + 5 home-grid apps:

| ID           | Location | Module         |
| ------------ | -------- | -------------- |
| `safari`     | dock     | `./safari`     |
| `mail`       | dock     | `./mail`       |
| `notes`      | dock     | `./notes`      |
| `music`      | dock     | `./music`      |
| `calculator` | home     | `./calculator` |
| `weather`    | home     | `./decorative` |
| `stocks`     | home     | `./decorative` |
| `maps`       | home     | `./decorative` |
| `youtube`    | home     | `./decorative` |

`./decorative` is one shared module — Weather/Stocks/Maps/YouTube all render
the same "cannot connect to server" screen iOS 1 used when AT&T EDGE was out.

### Navigator & AppFrame

**`lib/navigator.ts::IpodNavigator`** is the singleton equivalent of the
desktop's `windowManager`, ~150 lines:

```ts
type IpodScreen =
  | { kind: 'home' }
  | {
      kind: 'app';
      instanceId: string;
      manifest: IpodAppManifest;
      frame: AppFrame;
      abort: AbortController;
      instance: IpodAppInstance | null;
    };

class IpodNavigator {
  private stack: IpodScreen[] = [{ kind: 'home' }];
  private busy = false;

  async openApp(manifest): Promise<void>;
  async goHome(): Promise<void>;
}
```

`openApp` is re-entrancy-guarded with `busy`: taps during an in-flight
animation or while another app is already open are ignored (iOS 1 behaved
the same way). It creates an `AppFrame`, pushes onto the stack _before_
awaiting the loader (so a second tap sees `current().kind === 'app'`),
dynamic-imports the app, mounts it, and waits for the slide-up animation.

`goHome` aborts the app's `AbortController` (so signal-bound listeners clean
up), calls `unmount()`, plays the slide-down animation, then removes the
frame element and pops the stack.

**`lib/appFrame.ts::createAppFrame(opts)`** builds the fullscreen chrome
imperatively:

```
<section class="ipod-app-frame entering">
  <header class="ipod-nav-bar">
    <button class="back">Home</button>
    <h1 class="title">…</h1>
  </header>
  <div class="ipod-app-root">  ← AppMountContext.root
  </div>
</section>
```

`playEnter()` forces a reflow before removing `.entering` so the CSS
transition actually runs on first paint. `playExit()` adds `.exiting` and
resolves after `SLIDE_MS` — keep that constant in sync with the CSS
transition duration in `styles/global.css`.

**`lib/ipod-host.ts::createIpodHost`** returns an `IpodAppHostAPI`:

```ts
createIpodHost({ setNavBarTitle: frame.setNavBarTitle }, navigator)
  ⇒ { setTitle, setIcon, close }
```

`close()` calls `navigator.goHome()`. `setIcon` is a no-op on iPod (no icon
chrome) but the signature matches `BaseAppHostAPI` for portability.

### iPod bootstrap

`shells/ipod/bootstrap.ts::mount()`:

1. Patches SSR'd `[data-i18n]` labels to the live locale (fixes English
   fallbacks emitted by Astro when the visitor is French).
2. Starts the status-bar clock.
3. Delegates clicks on `[data-app-id]` elements anywhere in `#ipod-shell` →
   dispatches `ipod:launch` with `{ appId }`.
4. Listens for `ipod:launch` → looks up the manifest → calls
   `ipodNavigator.openApp(manifest)`.

---

## Astro layer and event bus

Astro runs at build time. Everything in `.astro` files is rendered to HTML
statically; the only client code Astro itself ships is the inline scripts in
`BaseLayout.astro` (locale + shell detection) and the module chooser in
`index.astro`. Everything else loads through the dynamic `import('./bootstrap')`
per shell.

### Desktop event bus

Communication between desktop shell components is `document.dispatchEvent(new
CustomEvent(...))`. Every listener lives on `document`, so nothing needs
wiring up when windows come and go.

| Event               | Dispatched by                                  | Listener(s)                 | Detail                     |
| ------------------- | ---------------------------------------------- | --------------------------- | -------------------------- |
| `xp:launch`         | Desktop icons, Start menu, Explorer, shortcuts | `bootstrap.ts` → `launch()` | `{ appId?, path?, args? }` |
| `xp:close`          | Title-bar X button, `AppHostAPI.close()`       | `appHost.handleClose`       | `{ id }` (instance ID)     |
| `xp:minimize`       | Title-bar minimize, Taskbar button             | `windowManager`, `appHost`  | `{ id }`                   |
| `xp:maximize`       | Title-bar maximize, dblclick on title bar      | `windowManager`             | `{ id }`                   |
| `xp:restore`        | Taskbar button                                 | `windowManager`, `appHost`  | `{ id }`                   |
| `xp:focus`          | Taskbar button                                 | `windowManager`, `appHost`  | `{ id }`                   |
| `xp:taskbar-update` | `windowManager.syncTaskbar()`                  | `Taskbar.astro`, `appHost`  | `{ windows, focusedId }`   |
| `xp:app-launch`     | `appHost.launch()` before loader               | `clippy.ts`                 | `{ appId }`                |
| `xp:game-win`       | Minesweeper                                    | `clippy.ts`                 | `{ appId }`                |
| `xp:game-lose`      | Minesweeper                                    | `clippy.ts`                 | `{ appId }`                |

Important: `xp:launch` carries **app/file identifiers**. All other `xp:*`
events carry **instance IDs** (whatever `windowManager.create()` was given).

### iPod event bus

The iPod shell uses one event on `document`:

| Event         | Dispatched by                   | Listener                   | Detail      |
| ------------- | ------------------------------- | -------------------------- | ----------- |
| `ipod:launch` | `bootstrap.ts` click delegation | `bootstrap.ts` → navigator | `{ appId }` |

### `pages/index.astro` + per-shell `bootstrap.ts`

`index.astro` only wires the shell chooser and calls `mount()`. All event
plumbing — title-bar delegation, `xp:*` routing, Clippy init, initial
"About Me" launch — lives in `shells/desktop/bootstrap.ts` so it ships in the
desktop chunk and not on mobile.

---

## Styling

- `shells/desktop/styles/variables.css` — theme tokens (colors, gradients,
  shadows, cursors). All XP chrome references these.
- `shells/desktop/styles/window.css` — window chrome, `is-focused`,
  `is-maximized`, resize cursors.
- `shells/desktop/styles/menubar.css` — shared `.xp-menubar` + dropdown
  styles. Used by every app's menu; zero per-app menu CSS.
- `shells/desktop/styles/{desktop,taskbar,start-menu}.css` — shell surfaces.
- `shells/desktop/styles/clippy.css` — the Clippy overlay.
- `shells/desktop/styles/global.css` — pulls everything together; imported
  once by `DesktopShell.astro`.
- Apps own their body styles via per-app CSS files imported from their
  `index.ts`. Vite bundles them into the app's lazy chunk so the initial
  page doesn't pay for them.
- `shells/ipod/styles/global.css` — iOS 1 home screen, dock, status bar, and
  app-frame transition timing. Imported once by `IpodShell.astro`.

No CSS framework, no CSS-in-JS, no CSS modules. Plain CSS with variables.

---

## Tooling & tests

`package.json` scripts:

| Script                 | What it does                       |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | `astro dev`                        |
| `npm run build`        | `astro build` (Cloudflare adapter) |
| `npm run preview`      | `astro preview`                    |
| `npm test`             | `vitest run`                       |
| `npm run test:watch`   | `vitest` watch mode                |
| `npm run format`       | `prettier --write .`               |
| `npm run format:check` | `prettier --check .`               |
| `npm run lint`         | `eslint .`                         |

- **TypeScript**: extends `astro/tsconfigs/strict` with
  `noUncheckedIndexedAccess: true`. Array and record lookups return `T |
undefined` — the codebase uses explicit non-null assertions (`!`) or
  guards at each access site.
- **vitest** suites cover the pure logic surfaces:
  - `shells/desktop/fs/api.test.ts` — `resolve`, `parentPath`, `joinPath`,
    `listChildren`.
  - `shells/desktop/apps/minesweeper/game.test.ts` — `nearIndexes`,
    `initCells`, `placeMines`, `autoOpenIndexes` flood-fill, `countRemainingSafe`,
    `cycleMark`.
  - `i18n/index.test.ts` — interpolation, fallback, en↔fr key parity.
- **Prettier** is configured via `.prettierrc.json` (single quotes, trailing
  commas, 100-col) with `prettier-plugin-astro` for `.astro` files. Content,
  public, and build outputs are ignored.
- **ESLint** uses the flat-config format in `eslint.config.js` with
  `@typescript-eslint` recommended rules and `no-unused-vars` +
  `no-explicit-any` as warnings.

---

## Recipes

### Add a markdown file

1. **Write the content** in `src/content/` (and the French translation in
   `src/content/fr/`):

   ```
   src/content/hobbies.md
   src/content/fr/hobbies.md
   ```

2. **Reference it in `src/shells/desktop/fs/tree.ts`** — drop a `FileNode`
   anywhere you want it to appear:

   ```ts
   {
     kind: 'file',
     name: 'Hobbies.md',
     ext: '.md',
     load: () =>
       getLocale() === 'fr'
         ? import('../../../content/fr/hobbies.md?raw').then((m) => m.default)
         : import('../../../content/hobbies.md?raw').then((m) => m.default),
   },
   ```

3. **That's it.** `.md` already maps to `notepad` in the file-type registry.
   Double-click → Notepad opens it. No changes to apps, registry, or
   components. Add a `desktopPosition: { row, col }` to make it a fixed
   desktop icon.

### Add a folder or desktop shortcut

**Folder** — append a `FolderNode` to any `children` array in `tree.ts`:

```ts
{
  kind: 'folder',
  name: 'Blog',
  icon: '/icons/folder-32.png',
  children: [ /* …FileNodes */ ],
}
```

**Desktop shortcut** — append a `ShortcutNode` under `/Desktop`:

```ts
{
  kind: 'shortcut',
  name: 'My Blog',
  icon: '/icons/folder-32.png',
  target: { appId: 'explorer', path: '/My Documents/Blog' },
  desktopPosition: { row: 5, col: 1 },
}
```

Shortcut icons render with the shortcut-arrow overlay on both the desktop
and inside Explorer (disable via `displayShortcutArrow: false`).

### Add a file type

Example: add JSON support mapped to Notepad.

```ts
// src/shells/desktop/lib/fileTypes.ts
'.json': {
  ext: '.json',
  icon: '/icons/notepad.png',
  defaultAppId: 'notepad',
  displayName: 'JSON File',
},
```

Optionally add `acceptsFileTypes: ['.md', '.txt', '.json']` to the Notepad
manifest for discoverability. For a brand-new default app (`.png` → image
viewer), write the app first (next recipe) then set `defaultAppId`.

### Add a desktop app

1. **Create the module** under `src/shells/desktop/apps/<id>/`:

   ```ts
   // src/shells/desktop/apps/clock/index.ts
   import type { AppModule } from '../types';
   import './clock.css';

   const mod: AppModule = {
     mount({ root, host, signal }) {
       root.classList.add('clock');
       const face = document.createElement('div');
       face.className = 'clock__face';
       root.appendChild(face);

       const tick = () => {
         face.textContent = new Date().toLocaleTimeString();
       };
       tick();
       const id = setInterval(tick, 1000);
       signal.addEventListener('abort', () => clearInterval(id));

       return {
         unmount() {
           root.classList.remove('clock');
           root.innerHTML = '';
         },
       };
     },
   };
   export default mod;
   ```

2. **Register it** in `src/shells/desktop/apps/registry.ts`:

   ```ts
   {
     id: 'clock',
     title: 'Clock',
     icon: '/icons/clock.png',
     defaultWidth: 240,
     defaultHeight: 160,
     kind: 'singleton',
     showInStartMenu: true,
     loader: () => import('./clock'),
   },
   ```

3. **Optional**: add a `ShortcutNode` under `/Desktop` in `fs/tree.ts`, or
   open through the start menu.

**App kind cheat-sheet**:

- `singleton` — one instance at a time (Minesweeper, Outlook Express).
  Re-launching focuses it.
- `document` — one instance per file or `args.path` key (Notepad, About,
  Adobe Reader).
- `multi` — every launch spawns a new window (BSOD, Compose). Combine with
  `findExistingInstance` if you want runtime-state-based dedup (Explorer).

**Dialog-style chrome** (About): set `controls: ['close']`,
`showWindowIcon: false`, `resizable: false`, `showInTaskbar: false`.

**Shared menu bar**: import `createMenuBar` from `../../lib/menubar` and
pass a `MenuSchema` + `onAction`. Bind teardown to `signal` so it dies with
your app.

**Interactive apps / games**: pause RAF loops on `onMinimize` and `onBlur`;
size canvases from `onResize`; attach DOM listeners with `{ signal }` so
they auto-remove on close.

### Add an iPod app

1. **Create the module** under `src/shells/ipod/apps/<id>/`:

   ```ts
   // src/shells/ipod/apps/photos/index.ts
   import type { IpodAppModule } from '../types';
   import './photos.css';

   const mod: IpodAppModule = {
     mount({ root, host, signal }) {
       root.classList.add('photos');
       root.innerHTML = `<h2>Photos</h2>`;
       host.setTitle('Photos');
       return {
         unmount() {
           root.innerHTML = '';
         },
       };
     },
   };
   export default mod;
   ```

2. **Register it** in `src/shells/ipod/apps/registry.ts`:

   ```ts
   {
     id: 'photos',
     title: 'Photos',
     titleKey: 'ipod.app.photos',       // add to both i18n files
     icon: icon('photos'),              // /ipod/icons/photos.png
     location: 'home',
     order: 5,
     loader: () => import('./photos'),
   },
   ```

3. **Add the icon PNG** at `public/ipod/icons/photos.png` (57×57 iOS 1 style).

The navigator picks it up automatically: tap the home-grid icon → slide-up
animation → `mount(ctx)` → nav-bar back button → `goHome()`. Tear-down via
the `signal` happens before `unmount()` so event listeners don't race the
DOM removal.

### Add a translation key

1. Add the key to `src/i18n/en.ts`. English is the source of truth; `I18nKey`
   is `keyof typeof en`.
2. Add the matching key to `src/i18n/fr.ts`. Order doesn't matter; parity
   does — `i18n/index.test.ts` fails if the two files diverge.
3. Use it via `t('my.new.key', ...args)`. Pass it to `titleKey` on an
   `IpodAppManifest` if it's an app title; on the iPod shell, `bootstrap.ts`
   live-patches SSR'd `[data-i18n]` elements after mount.

---

## Architectural principles

Rules the codebase is meant to keep as it grows:

1. **One entry point per shell.** Desktop: every "open X" goes through
   `shells/desktop/lib/launcher.ts::launch()`. iPod: every launch goes through
   `ipodNavigator.openApp()` via an `ipod:launch` event. Never bypass.

2. **`core/` has no shell imports.** Shells depend on `core/`, never the
   reverse. If something feels shared, it goes in `core/`; if it references
   anything shell-specific, it doesn't.

3. **Instance IDs are opaque strings.** Everything downstream of the app host
   / navigator (window manager, taskbar, event bus) treats them as keys.
   Never parse them.

4. **Apps are sandboxes.** An app's only contact surface is its mount context
   plus the instance hooks it returns. An app should not import the window
   manager, not know about other apps, not reach into the DOM outside its
   `root`.

5. **The window manager doesn't know about content.** It creates and destroys
   DOM nodes and tracks geometry. If you need to teach it about apps or files,
   extend the app host instead.

6. **Code-split by default.** Apps (`loader: () => import(...)`) and content
   files (`load: () => import('...?raw')`) use dynamic imports so they ship
   as separate chunks. Heavy libraries (`marked`, `pdfjs-dist`) must not land
   in the initial bundle of either shell.

7. **Shell isolation.** The mobile visitor never downloads the desktop shell
   (CSS, components, window manager, Clippy, marked). Anything imported by
   `shells/desktop/bootstrap.ts` belongs to the desktop chunk; same for iPod.
   Only `core/`, `i18n/`, `layouts/`, and `content/` may be reached by both.

8. **Prefer declarative over imperative.** The VFS tree, both app registries,
   and the file-type registry are plain data. Adding a file or an app is
   usually one entry, not a new code path.

9. **No framework runtime.** Astro renders the static scaffold; everything
   at runtime is vanilla TypeScript. No React, no signals, no store. Custom
   events on `document` are the only message bus.

10. **Typed indexed access.** `noUncheckedIndexedAccess` is on — trust that
    `arr[i]` is `T | undefined` and either assert (`!`) at a known-safe site
    or guard. Tests cover the pure surfaces (`fs/api`, `minesweeper/game`,
    `i18n`).

11. **Fail loudly in dev, gracefully in production.** The host wraps every
    app callback in try/catch with `[appHost]` / `[ipod/navigator]` prefixes.
    The launcher warns on unresolved paths and returns cleanly.

12. **Style stays in plain CSS.** Theme tokens in `variables.css`, shared
    chrome in dedicated files (`window.css`, `menubar.css`), per-app body
    styles alongside the app. No Tailwind, no CSS-in-JS.
