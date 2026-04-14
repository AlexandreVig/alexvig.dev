# Windows XP Portfolio — Developer Documentation

A Windows XP–themed portfolio built with Astro. The page loads a desktop shell;
windows, apps, and file content are created dynamically on the client. Content
lives in markdown files inside a virtual file system, and all interactions
(opening a file, launching an app, navigating folders) flow through a single
shell launcher.

---

## Table of contents

1. [Mental model](#mental-model)
2. [Project structure](#project-structure)
3. [Layered architecture](#layered-architecture)
4. [The virtual file system (`src/fs/`)](#the-virtual-file-system-srcfs)
5. [The shell (`src/shell/`)](#the-shell-srcshell)
6. [The window manager (`src/lib/`)](#the-window-manager-srclib)
7. [The app host and apps (`src/apps/`)](#the-app-host-and-apps-srcapps)
8. [Components & layout (`src/components/`, `src/pages/`, `src/layouts/`)](#components--layout-srccomponents-srcpages-srclayouts)
9. [Styling (`src/styles/`)](#styling-srcstyles)
10. [The event bus](#the-event-bus)
11. [Launch lifecycle walkthroughs](#launch-lifecycle-walkthroughs)
12. [Recipes](#recipes)
    - [Add a markdown file](#add-a-markdown-file)
    - [Add a folder or desktop shortcut](#add-a-folder-or-desktop-shortcut)
    - [Add a file type](#add-a-file-type)
    - [Add a simple app (singleton)](#add-a-simple-app-singleton)
    - [Add a document app](#add-a-document-app)
    - [Add a multi-instance app](#add-a-multi-instance-app)
    - [Add an interactive app or game](#add-an-interactive-app-or-game)
13. [Architectural principles](#architectural-principles)

---

## Mental model

This codebase is organized like the real Windows XP shell:

- A **virtual file system** (VFS) defines folders, files, and shortcuts in a
  declarative tree.
- A **file-type registry** maps extensions (`.md`, `.txt`, …) to a default app.
- A **shell launcher** is the single entry point for "open something". You give
  it a path, or an app ID, or both. It figures out what to do.
- A **window manager** creates and destroys window DOM nodes at runtime, keyed
  by **instance ID**. It knows about geometry, drag/resize, focus, z-index — it
  does not know about apps or files.
- An **app host** bridges the shell and the window manager. It loads app modules
  lazily, keeps an instance map, and forwards lifecycle events.
- **Apps** are small TypeScript modules that receive a mount context (a DOM
  element, a file handle or args, a host API, an abort signal) and do whatever
  they want inside that element. They can be static content (notepad), file
  navigators (explorer), or fully interactive (a future game).

This gives you three clean extension points:

1. Add **content** → drop a markdown file under `src/content/` and reference it
   in `src/fs/tree.ts`.
2. Add a **file type** → add a row to `src/shell/fileTypes.ts` pointing at an
   existing or new app.
3. Add an **app** → create `src/apps/<id>/index.ts` exporting an `AppModule`
   and register it in `src/apps/registry.ts`.

Nothing else has to change.

---

## Project structure

```
computer-portfolio/
├── public/
│   └── icons/               # PNG icons used everywhere (XP chrome, files, apps)
├── src/
│   ├── apps/                # Apps + app runtime
│   │   ├── explorer/        # File Explorer app
│   │   ├── notepad/         # Markdown viewer
│   │   ├── host.ts          # Instance map + lifecycle coordinator
│   │   ├── registry.ts      # AppManifest[] — the list of known apps
│   │   └── types.ts         # AppManifest, AppModule, AppMountContext, AppInstance
│   ├── components/          # Astro components (server-rendered at build time)
│   │   ├── Desktop.astro    # Renders desktop icons from the VFS /Desktop folder
│   │   ├── DesktopIcon.astro
│   │   ├── StartMenu.astro
│   │   └── Taskbar.astro
│   ├── content/             # Markdown files that form the portfolio content
│   │   ├── about.md
│   │   ├── contact.md
│   │   ├── skills.md
│   │   └── projects/
│   │       └── portfolio.md
│   ├── fs/                  # Virtual file system
│   │   ├── api.ts           # resolve, listChildren, readFile, parentPath, …
│   │   ├── tree.ts          # Declarative VFS root (folders/files/shortcuts)
│   │   └── types.ts         # FsNode, FileNode, FolderNode, ShortcutNode, FileHandle
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/                 # Window machinery (DOM, geometry, state)
│   │   ├── types.ts         # CreateWindowOptions, WindowState, XpEventName
│   │   ├── windowDom.ts     # Imperative window DOM builder
│   │   └── windowManager.ts # Singleton that creates/destroys windows
│   ├── pages/
│   │   └── index.astro      # Entry point — wires up appHost, shell, event routing
│   ├── shell/               # Shell layer
│   │   ├── fileTypes.ts     # Extension → default app ID
│   │   └── launcher.ts      # launch({ appId?, path?, args? }) — the one entry point
│   └── styles/              # Plain CSS files (no framework)
│       ├── desktop.css
│       ├── global.css
│       ├── reset.css
│       ├── start-menu.css
│       ├── taskbar.css
│       ├── variables.css    # Colors, gradients, cursors — theme lives here
│       └── window.css
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── wrangler.jsonc           # Cloudflare Pages config
```

---

## Layered architecture

```
  User interaction  (desktop icon, start menu, explorer double-click, taskbar)
         │
         │  dispatches `xp:launch` CustomEvent
         ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  src/shell/launcher.ts                                           │
  │  launch({ appId?, path?, args? })                                │
  │  - resolves path via VFS                                         │
  │  - if file → FileHandle + file-type registry → default app       │
  │  - if folder/unresolved path + explicit appId → forwards as args │
  └──────────────────────────────────────────────────────────────────┘
         │
         │  { appId, file, args }
         ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  src/apps/host.ts                                                │
  │  - computes instanceId (singleton | document | multi)            │
  │  - dedupe: focus existing, else lazy-load module                 │
  │  - asks windowManager.create() for a DOM body                    │
  │  - builds AppMountContext and calls module.default.mount(ctx)    │
  │  - stores instance, subscribes to lifecycle events               │
  └──────────────────────────────────────────────────────────────────┘
         │                                    │
         │ mount(ctx)                         │ create/destroy/focus/…
         ▼                                    ▼
  ┌──────────────────────┐        ┌──────────────────────────────────┐
  │  src/apps/<id>/      │        │  src/lib/windowManager.ts        │
  │  index.ts            │        │  - Map<instanceId, WindowState>  │
  │  Your app code here. │        │  - drag, resize, focus, z-index  │
  │  Receives root,      │        │  - dispatches xp:taskbar-update  │
  │  file, args, host,   │        │  ┌──── src/lib/windowDom.ts ───┐ │
  │  signal.             │        │  │ createWindowElement(opts)   │ │
  └──────────────────────┘        │  └─────────────────────────────┘ │
                                  └──────────────────────────────────┘
```

Every layer has one job:

| Layer          | Knows about                     | Doesn't know about           |
| -------------- | ------------------------------- | ---------------------------- |
| `fs/`          | Folders, files, content loading | Apps, windows, events        |
| `shell/`       | File types, app IDs, VFS        | Window chrome, DOM           |
| `lib/`         | Window DOM, geometry, drag, z   | Apps, file types, shell      |
| `apps/host.ts` | Apps, lifecycle, instance map   | Geometry, markdown, explorer |
| `apps/<id>/`   | Its own content and UI          | Other apps, window chrome    |
| `components/`  | Astro SSR of the page shell     | Runtime app state            |

---

## The virtual file system (`src/fs/`)

### Types (`src/fs/types.ts`)

```ts
export type FsNode = FolderNode | FileNode | ShortcutNode;

export interface FolderNode {
  kind: 'folder';
  name: string;
  icon?: string;
  children: FsNode[];
}

export interface FileNode {
  kind: 'file';
  name: string;
  icon?: string;
  ext: string; // ".md"
  load: () => Promise<string>; // lazy — one chunk per file
}

export interface ShortcutNode {
  kind: 'shortcut';
  name: string;
  icon?: string;
  target: { appId: string; path?: string };
}

export interface FileHandle {
  path: string; // canonical VFS path
  name: string;
  ext: string;
  icon: string;
  read(): Promise<string>; // memoized per handle
}
```

### Tree (`src/fs/tree.ts`)

The VFS is a single declarative tree rooted at `/`. Each folder's `children`
array is an explicit list of `FsNode`s — the order you write is the order
Explorer and Desktop will render in.

File nodes reference content through a lazy dynamic import:

```ts
{
  kind: 'file',
  name: 'About Me.md',
  ext: '.md',
  load: () => import('../content/about.md?raw').then((m) => m.default),
}
```

`?raw` is a Vite query that imports the file contents as a string. Because each
import is dynamic, Vite emits one JS chunk per markdown file — opening
`About Me.md` only ships `about.md` over the wire; the other files stay on
disk until requested.

### API (`src/fs/api.ts`)

Pure functions over the tree. No state, no caching beyond `FileHandle.read()`.

| Function                               | Returns                       | Used by              |
| -------------------------------------- | ----------------------------- | -------------------- |
| `resolve(path)`                        | `FsNode \| null`              | shell, explorer      |
| `listChildren(path)`                   | `FsNode[]`                    | explorer             |
| `readFile(path)`                       | `Promise<FileHandle \| null>` | shell                |
| `parentPath(path)`                     | `string`                      | explorer "Up" button |
| `joinPath(parent, name)` / `pathOf(…)` | `string`                      | explorer, desktop    |
| `iconForNode(node)`                    | `string`                      | desktop, explorer    |
| `desktopNodes()`                       | `FsNode[]`                    | Desktop.astro        |

Paths are slash-delimited strings. No case normalization, no backslashes, no
trailing-slash magic. `segments()` internally drops empty segments so `/` and
`''` both resolve to root.

---

## The shell (`src/shell/`)

### File types (`src/shell/fileTypes.ts`)

A flat `Record<string, FileTypeDef>` keyed by lowercased extension:

```ts
const registry: Record<string, FileTypeDef> = {
  '.md': {
    ext: '.md',
    icon: '/icons/notepad.png',
    defaultAppId: 'notepad',
    displayName: 'Markdown Document',
  },
  '.txt': {
    ext: '.txt',
    icon: '/icons/notepad.png',
    defaultAppId: 'notepad',
    displayName: 'Text Document',
  },
};
```

`getFileType(ext)` returns the entry or a fallback pointing at notepad.

Adding a new file type is a one-line change plus an icon:

```ts
'.png': { ext: '.png', icon: '/icons/image.png', defaultAppId: 'image-viewer', displayName: 'Image' },
```

### Launcher (`src/shell/launcher.ts`)

The single entry point for "open something":

```ts
export interface LaunchRequest {
  appId?: string;
  path?: string;
  args?: Record<string, unknown>;
}

export async function launch(req: LaunchRequest): Promise<void>;
```

Rules, in order:

1. If `path` is given:
   - If it resolves to a **file** → read it into a `FileHandle`.
   - Else if `appId` is explicit → forward the path via `args.path` (so
     folder-aware apps like Explorer can use it as a start directory).
   - Else → warn and bail.
2. If `appId` is not given, fall back to the file's default app from the
   file-type registry.
3. Call `appHost.launch({ appId, file, args })`.

**Every UI surface** (desktop icons, start menu, taskbar, explorer
double-click) goes through `launch()`. There is no other path to the app host.

---

## The window manager (`src/lib/`)

### `types.ts`

```ts
export interface CreateWindowOptions {
  instanceId: string;
  title: string;
  icon: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface WindowState {
  id: string; // instance ID
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
  openedAt?: number; // counter for taskbar ordering
}
```

### `windowDom.ts`

`createWindowElement(opts)` imperatively builds the DOM for one window:

```
.window[data-window-id="<instanceId>"]
├── .header__bg
├── .title-bar
│   ├── img.title-bar-icon
│   ├── .title-bar-text
│   └── .title-bar-controls
│       ├── button[data-action="minimize"]
│       ├── button[data-action="maximize"]
│       └── button[data-action="close"]
└── .window-body              ← app mounts here
```

Returns `{ root, body }`. The markup matches what `window.css` expects, so all
styling keeps working unchanged.

### `windowManager.ts`

Singleton class exported as `windowManager`. Public API:

| Method                            | Effect                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `create(opts): HTMLElement`       | Builds a window, appends to `#desktop`, wires drag/resize, focuses it. Returns the `.window-body` the app should mount into. |
| `destroy(id)`                     | Removes the DOM node and deletes state.                                                                                      |
| `has(id)`                         | Is this instance id tracked?                                                                                                 |
| `focus(id)`                       | Raises z-index, toggles `is-focused` / `is-unfocused` classes, dispatches taskbar update.                                    |
| `minimize(id)` / `restore(id)`    | Hides/shows and updates taskbar.                                                                                             |
| `maximize(id)`                    | Toggles the `is-maximized` class (CSS handles sizing).                                                                       |
| `setTitle(id, title)`             | Updates title-bar text and taskbar.                                                                                          |
| `getState(id)` / `getAllStates()` | State introspection.                                                                                                         |

Internals:

- `setupInteraction(el, id)` wires mouse-based drag (title bar) and resize
  (edges) with a cursor cover div during drags. This is the only code that
  directly mutates inline `transform` / `width` / `height` during interaction —
  `applyState()` is the authoritative sync at rest.
- `syncTaskbar()` emits `xp:taskbar-update` with `{ windows, focusedId }`. The
  taskbar component listens and rebuilds its button list.
- Cascading: new windows auto-cascade (`CASCADE_BASE_*` + `CASCADE_STEP`) unless
  `x`/`y` are provided in `CreateWindowOptions`.

The window manager does **not** know about apps. It is told to `create` and
`destroy` by the app host.

---

## The app host and apps (`src/apps/`)

### Types (`src/apps/types.ts`)

```ts
export type AppKind = 'singleton' | 'document' | 'multi';

export interface AppManifest {
  id: string;
  title: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  kind: AppKind;
  acceptsFileTypes?: string[];
  showInStartMenu?: boolean;
  loader: () => Promise<{ default: AppModule }>;
}

export interface AppModule {
  mount(ctx: AppMountContext): AppInstance | void | Promise<AppInstance | void>;
}

export interface AppMountContext {
  root: HTMLElement; // .window-body
  instanceId: string;
  file: FileHandle | null; // null unless launched with a file
  args: Record<string, unknown>; // extra launch arguments
  host: AppHostAPI;
  signal: AbortSignal; // aborted on unmount
}

export interface AppInstance {
  unmount?(): void;
  onResize?(width: number, height: number): void;
  onFocus?(): void;
  onBlur?(): void;
  onMinimize?(): void;
  onRestore?(): void;
  onLaunchArgs?(args: Record<string, unknown>): void;
}

export interface AppHostAPI {
  setTitle(title: string): void;
  close(): void;
}
```

### App kinds

Instance IDs drive everything. The `host.computeInstanceId(manifest, file, args)`
rule:

| Kind        | Instance ID                              | Behavior on relaunch                 |
| ----------- | ---------------------------------------- | ------------------------------------ |
| `singleton` | `<appId>` (e.g. `minesweeper`)           | Focus existing, never a new window   |
| `document`  | `<appId>:<file.path or args.path or "">` | Focus existing if same key; else new |
| `multi`     | `<appId>#<++counter>` (always unique)    | Every launch spawns a new window     |

`document` is the clever one: it's keyed on file path **or** `args.path`. That's
why Notepad opens one window per markdown file _and_ Explorer opens one window
per starting folder — same code path.

### Host (`src/apps/host.ts`)

The host owns one `Map<instanceId, MountedEntry>`. On launch:

1. Look up the manifest by `appId`.
2. Compute the `instanceId` by kind.
3. If already mounted → restore/focus + forward `onLaunchArgs` if args given.
4. If a loader is already in flight for that ID → ignore (debounce).
5. `await manifest.loader()`.
6. `windowManager.create({...})` — returns the `.window-body` to mount into.
7. Build an `AbortController`, the host API (`setTitle`, `close`), and the
   mount context; call `module.default.mount(ctx)`.
8. Attach a `ResizeObserver` on the body so apps receive `onResize(w, h)` on
   window drag-resize.
9. Store the entry.

On `xp:close`:

- Find the entry, call `unmount()`, abort the signal (so listeners attached
  with `{ signal }` auto-remove), disconnect the observer, remove from map,
  call `windowManager.destroy(id)`.

Lifecycle hooks are forwarded from events:

- `xp:minimize` → `instance.onMinimize()` + `setFocused(id, false)`
- `xp:restore` → `instance.onRestore()`
- `xp:taskbar-update` — the host diffs the new `focusedId` against each
  entry's previous focused state and fires `onFocus` / `onBlur` only on
  transitions.

All host methods wrap app calls in try/catch so one buggy app can't break the
host.

### Registry (`src/apps/registry.ts`)

A plain array of `AppManifest` objects. Adding an app = adding one entry.

### Notepad (`src/apps/notepad/`)

- `index.ts` — reads `ctx.file`, calls `host.setTitle(...)`, renders menu +
  body. For `.md`, `render.ts` lazy-imports `marked`; for `.txt`, escapes and
  wraps in `<pre>`.
- `notepad.css` — XP-ish formatted prose styles inside the window body.
- `kind: 'document'` + `acceptsFileTypes: ['.md', '.txt']`. Each file gets its
  own window; re-opening the same file focuses the existing one.

### Explorer (`src/apps/explorer/`)

- `index.ts` — toolbar (Back/Up), address bar, icon grid, click + double-click.
  Folders navigate in-place; files call `launch({ path })`; shortcuts call
  `launch({ appId, path })`. Shortcut items get an `is-shortcut` class so
  they render with the shortcut-arrow overlay.
- `explorer.css` — listing styles.
- `kind: 'document'` (folder-path-keyed) + `showInStartMenu: true`. Opening
  `/Desktop` twice focuses the existing window; opening `/` and `/My Documents`
  gives you two Explorer windows.

---

## Components & layout (`src/components/`, `src/pages/`, `src/layouts/`)

Astro runs at build time. Everything in `.astro` files is rendered to HTML
statically; the `<script>` blocks are the only client-side code shipped by
Astro itself.

### `src/pages/index.astro`

The top-level entry. It:

1. Renders `<BaseLayout><Desktop /></BaseLayout>` (the desktop background and
   icons).
2. On `DOMContentLoaded`:
   - `appHost.init(apps)` — registers manifests and subscribes to lifecycle
     events.
   - Listens for `xp:launch` → calls `shell.launch(detail)`.
   - Forwards `xp:minimize`, `xp:maximize`, `xp:restore`, `xp:focus` to
     `windowManager`. (`xp:close` is handled by the host, which also destroys
     the window.)
   - Delegates title-bar button clicks (`[data-action][data-window-target]`)
     → dispatches the matching `xp:<action>` event.
   - Delegates double-clicks on `.title-bar` → dispatches `xp:maximize`.

### `src/components/Desktop.astro`

Iterates `desktopNodes()` (children of the `/Desktop` VFS folder) and renders a
`<DesktopIcon>` for each. Shortcuts get `isShortcut`, files get their own
path, folders get an explorer launch.

### `src/components/DesktopIcon.astro`

Renders one icon. On double-click, dispatches `xp:launch` with
`{ appId, path }` from `data-` attributes. Single-click toggles `is-selected`.
Shortcut icons render with a badge via the
`.desktop-icon.is-shortcut .desktop-icon__img-wrap::after` CSS rule.

### `src/components/StartMenu.astro`

- **Left pane**: iterates `apps.filter(a => a.showInStartMenu)` — driven by the
  registry.
- **Right pane**: a curated list of shortcuts (My Documents, My Computer, etc.)
  dispatching `xp:launch` with the target path/app.
- Toggles on start-button click, closes on outside click.

### `src/components/Taskbar.astro`

- Clock updates every second but only writes `textContent` when the value
  actually changes (avoids dev-mode DOM audit churn).
- Listens for `xp:taskbar-update` and rebuilds its window button list. Each
  button uses the `WindowState.id` (= instance ID) to dispatch `xp:restore`,
  `xp:minimize`, or `xp:focus`.

---

## Styling (`src/styles/`)

- `reset.css`, `global.css`, `variables.css` — base styles and theme. All XP
  colors, gradients, and custom cursors live in `variables.css` as CSS custom
  properties.
- `window.css` — the window chrome (title bar, frame, `is-focused`,
  `is-maximized`, resize cursors).
- `desktop.css`, `taskbar.css`, `start-menu.css` — shell styles.
- Apps own their body styles via per-app CSS files (`notepad.css`,
  `explorer.css`) imported from `index.ts`. Vite bundles these into the app's
  lazy chunk so the initial page doesn't pay for them.

No CSS framework, no CSS-in-JS, no CSS modules. Just plain CSS with variables.

---

## The event bus

Communication between components is `document.dispatchEvent(new CustomEvent(...))`.
Every listener lives on `document`, so there's nothing to wire and nothing to
tear down as windows come and go.

| Event               | Dispatched by                                    | Listener(s)                | Detail                                  |
| ------------------- | ------------------------------------------------ | -------------------------- | --------------------------------------- |
| `xp:launch`         | DesktopIcon, StartMenu, Explorer (via shell API) | `index.astro` → shell      | `{ appId?, path?, args? }`              |
| `xp:close`          | Title-bar close button, `AppHostAPI.close()`     | `appHost.handleClose`      | `{ id }` (instance ID)                  |
| `xp:minimize`       | Title-bar minimize, Taskbar button               | `windowManager`, `appHost` | `{ id }`                                |
| `xp:maximize`       | Title-bar maximize, dblclick on title bar        | `windowManager`            | `{ id }`                                |
| `xp:restore`        | Taskbar button                                   | `windowManager`, `appHost` | `{ id }`                                |
| `xp:focus`          | Taskbar button                                   | `windowManager`, `appHost` | `{ id }`                                |
| `xp:taskbar-update` | `windowManager.syncTaskbar()`                    | `Taskbar.astro`, `appHost` | `{ windows: WindowState[], focusedId }` |

Important: `xp:launch` carries **app/file identifiers**. All other `xp:*`
events carry **instance IDs** (whatever `windowManager.create()` was given).

---

## Launch lifecycle walkthroughs

### Double-click `About Me.md` on the desktop

1. `DesktopIcon.astro` delegates the double-click and dispatches
   `xp:launch` with `{ path: '/Desktop/About Me.md' }`.
2. `index.astro` routes it to `shell.launch({ path: '/Desktop/About Me.md' })`.
3. Launcher calls `resolve('/Desktop/About Me.md')` → `FileNode`, then
   `readFile(...)` → `FileHandle`.
4. File ext `.md` → file type registry → default app `notepad`.
5. Launcher calls `appHost.launch({ appId: 'notepad', file, args: undefined })`.
6. Host computes `instanceId = 'notepad:/Desktop/About Me.md'`. Not mounted.
7. `await manifest.loader()` — lazy-imports `src/apps/notepad/index.ts` and
   its CSS. `marked` is not yet loaded.
8. `windowManager.create({...})` builds the window DOM, wires drag/resize,
   appends it to `#desktop`, focuses it, dispatches `xp:taskbar-update`.
9. Host calls `notepad.mount(ctx)`. Notepad calls `ctx.file.read()` (lazy
   dynamic import of `about.md?raw`), calls `renderMarkdown()` (lazy import
   of `marked`), sets `innerHTML`, calls `host.setTitle('About Me.md — Notepad')`.
10. `ResizeObserver` starts observing the body. The host stores the entry.

### Double-click the same file again

1. Steps 1–5 repeat.
2. Host finds `'notepad:/Desktop/About Me.md'` already mounted.
3. If minimized → `windowManager.restore(id)`, else `windowManager.focus(id)`.
4. No remount, no new window.

### Double-click `My Computer` shortcut

1. DesktopIcon dispatches `xp:launch` with `{ appId: 'explorer', path: '/' }`.
2. Launcher sees `appId` explicit, resolves `/` → `FolderNode`, so it forwards
   the path as `args.path`: `appHost.launch({ appId: 'explorer', file: null,
args: { path: '/' } })`.
3. Host computes `instanceId = 'explorer:/'` (document kind falls back to
   `args.path`).
4. Not mounted → lazy-load, create window, mount. Explorer reads `args.path`
   and renders listing for `/`.

### Close the window

1. User clicks the X. Title bar button delegation in `index.astro` fires
   `xp:close` with `{ id: 'explorer:/' }`.
2. `appHost.handleClose('explorer:/')` runs: finds the entry, calls
   `unmount()`, aborts the signal (any listeners attached with `{ signal }`
   auto-detach), disconnects the `ResizeObserver`, removes from map, calls
   `windowManager.destroy('explorer:/')` which removes the DOM node and emits
   `xp:taskbar-update`.

---

## Recipes

### Add a markdown file

Three steps:

1. **Write the content**:

   ```
   src/content/hobbies.md
   ```

   ```markdown
   # Hobbies

   - Woodworking
   - Retro computing
   ```

2. **Reference it in `src/fs/tree.ts`** — drop a `FileNode` wherever you want
   it to appear. Inside `My Documents`, for example:

   ```ts
   {
     kind: 'file',
     name: 'Hobbies.md',
     ext: '.md',
     load: () => import('../content/hobbies.md?raw').then((m) => m.default),
   },
   ```

   The `name` is what Explorer and the desktop show. The `load` path is the
   source file; it ships as its own lazy chunk.

3. **That's it.** Because `.md` already maps to `notepad` in the file-type
   registry, double-click → Notepad opens it. No changes to apps, registry,
   or components.

Optional: give the file a custom `icon: '/icons/xxx.png'` on the node, or
place it under `/Desktop` instead of `/My Documents` to make it a desktop icon.

### Add a folder or desktop shortcut

**Folder** — add a `FolderNode` to any `children` array:

```ts
{
  kind: 'folder',
  name: 'Blog',
  icon: '/icons/folder-32.png',
  children: [
    // ...FileNodes
  ],
}
```

**Desktop shortcut** — add a `ShortcutNode` under `/Desktop`:

```ts
{
  kind: 'shortcut',
  name: 'My Blog',
  icon: '/icons/folder-32.png',
  target: { appId: 'explorer', path: '/My Documents/Blog' },
}
```

Shortcut icons automatically render with the shortcut-arrow overlay on both
the desktop and inside Explorer.

### Add a file type

For example, add support for plain JSON files shown in Notepad:

```ts
// src/shell/fileTypes.ts
'.json': {
  ext: '.json',
  icon: '/icons/notepad.png',
  defaultAppId: 'notepad',
  displayName: 'JSON File',
},
```

Then add an `acceptsFileTypes: ['.md', '.txt', '.json']` entry to the Notepad
manifest if you want it to advertise the type, and an `ext: '.json'` FileNode
in the VFS tree pointing at whatever content you want to load.

For a **new default app** (e.g. `.png` → new image viewer), create the app
first (next recipe) and then set `defaultAppId: 'image-viewer'`.

### Add a simple app (singleton)

A singleton app has one instance and runs on launch with no file. Example:
a clock.

1. **Create the app module**:

   ```
   src/apps/clock/index.ts
   src/apps/clock/clock.css
   ```

   ```ts
   // src/apps/clock/index.ts
   import type { AppModule } from '../types';
   import './clock.css';

   const mod: AppModule = {
     mount({ root, signal }) {
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

2. **Register it** in `src/apps/registry.ts`:

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

3. **Optional: add a desktop shortcut**:
   ```ts
   // in src/fs/tree.ts, inside /Desktop children
   {
     kind: 'shortcut',
     name: 'Clock',
     icon: '/icons/clock.png',
     target: { appId: 'clock' },
   },
   ```

That's the full surface. Launching from the start menu or the shortcut will
focus the existing clock window if it's already open, thanks to `kind:
'singleton'`.

### Add a document app

Document apps get a new window per opened file/path. Notepad is the reference
implementation. The only differences from a singleton:

- `kind: 'document'`
- `acceptsFileTypes: ['.ext1', '.ext2']`
- Inside `mount`, use `ctx.file` (for files) or `ctx.args.path` (for folder-
  aware apps) as the thing the window is "about". Call
  `host.setTitle(\`${file.name} — MyApp\`)`.
- Register the extension in `src/shell/fileTypes.ts` with
  `defaultAppId: 'myapp'`.

Every different file becomes its own window; opening the same file twice
focuses the existing one.

### Add a multi-instance app

Use `kind: 'multi'` when you genuinely want a new window on every launch and
no deduplication. Each instance gets a unique `#<counter>` suffix.

```ts
{
  id: 'browser',
  title: 'Web Browser',
  icon: '/icons/ie.png',
  defaultWidth: 800,
  defaultHeight: 600,
  kind: 'multi',
  loader: () => import('./browser'),
},
```

Good fits: browsers, editors that should always open a blank window, games
where the user wants multiple simultaneous boards.

### Add an interactive app or game

The mount context gives you everything you need:

```ts
import type { AppModule } from '../types';
import './minesweeper.css';

const mod: AppModule = {
  async mount({ root, signal }) {
    root.classList.add('minesweeper');

    const canvas = document.createElement('canvas');
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    let paused = false;
    let raf = 0;

    const loop = () => {
      if (paused) return;
      // draw frame
      raf = requestAnimationFrame(loop);
    };

    // Inputs — signal auto-removes on unmount
    canvas.addEventListener('click', onClick, { signal });
    canvas.addEventListener('keydown', onKey, { signal });

    raf = requestAnimationFrame(loop);

    return {
      onResize(w, h) {
        canvas.width = w;
        canvas.height = h;
      },
      onMinimize() {
        paused = true;
        cancelAnimationFrame(raf);
      },
      onBlur() {
        paused = true;
        cancelAnimationFrame(raf);
      },
      onRestore() {
        paused = false;
        raf = requestAnimationFrame(loop);
      },
      onFocus() {
        if (paused) {
          paused = false;
          raf = requestAnimationFrame(loop);
        }
      },
      unmount() {
        cancelAnimationFrame(raf);
        root.classList.remove('minesweeper');
        root.innerHTML = '';
      },
    };

    function onClick(_e: MouseEvent) {
      /* ... */
    }
    function onKey(_e: KeyboardEvent) {
      /* ... */
    }
  },
};

export default mod;
```

Important patterns:

- **Attach listeners with `{ signal }`** — they auto-remove on close.
- **Pause RAF loops on `onMinimize` and `onBlur`** — the window is invisible
  or backgrounded; don't burn CPU.
- **Size the canvas in `onResize`** — the host runs a `ResizeObserver` on the
  window body and forwards changes.
- **Clear the DOM in `unmount`** — the window element itself is destroyed by
  the window manager, but it's polite to drop references for GC.

Register with `kind: 'singleton'` (one game at a time) or `'multi'` (several
concurrent games). Add a desktop shortcut via `ShortcutNode`.

If the game needs assets, use dynamic imports so they only load on first
launch:

```ts
const { loadLevel } = await import('./levels');
```

---

## Architectural principles

These are the rules the codebase is meant to keep as it grows:

1. **One entry point for opening things.** Every "open X" action flows
   through `shell.launch()`. Never call `appHost.launch()` directly from a UI
   surface; let the shell resolve paths and defaults.

2. **Instance IDs are opaque strings.** Everything downstream of the app host
   (window manager, taskbar, event bus) treats them as keys. Never parse them.

3. **Apps are sandboxes.** An app's only contact surface is `AppMountContext`
   - `AppInstance`. An app should not import the window manager, not know
     about other apps, not reach into the DOM outside its `root`.

4. **The window manager doesn't know about content.** It creates and destroys
   DOM nodes, tracks geometry, and delegates everything else. If you find
   yourself needing to teach it about apps or files, extend the app host
   instead.

5. **Code-split by default.** Apps (`loader: () => import(...)`) and content
   files (`load: () => import('...?raw')`) use dynamic imports so they land
   in separate chunks. Heavy things (a game, a markdown parser) should never
   be in the initial bundle.

6. **Prefer declarative over imperative.** The VFS tree, the app registry,
   and the file-type registry are all plain data. Adding a file or an app is
   usually one entry, not a new code path.

7. **No framework runtime.** Astro renders the static shell; the rest is
   vanilla TypeScript. No React, no signals, no store. Custom events on
   `document` are the only message bus.

8. **Mutate DOM sparingly and intentionally.** Every avoidable mutation
   retriggers Astro's dev-mode DOM audit. When writing to text content,
   check for equality first (see the clock).

9. **Style stays in plain CSS.** Theme tokens live in `variables.css`; per-app
   body styles live alongside the app. No Tailwind, no CSS-in-JS.

10. **Fail loudly in dev, gracefully in production.** The host wraps every
    app callback in try/catch and logs with a `[appHost]` prefix. The shell
    warns on unresolved paths but doesn't throw.
