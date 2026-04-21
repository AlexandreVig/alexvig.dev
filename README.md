# Portfolio [avigneau.dev](https://avigneau.dev)

An interactive portfolio with two fully-themed shells that swap based on viewport:

- **Desktop** — a Windows XP experience with draggable/resizable windows, Start menu, taskbar, and a small suite of apps (About, Explorer, Notepad, Adobe Reader, Outlook, Minesweeper, BSOD, Clippy).
- **Mobile** — an iPod-style home screen with its own apps (Music, Safari, Mail, Notes, Calculator).

Built with Astro, hand-crafted CSS, vanilla TypeScript for window management and shell logic, and deployed on Cloudflare Pages.

## Stack

- Astro 6 (static + Cloudflare adapter)
- TypeScript, vanilla DOM (no UI framework)
- Vitest, ESLint, Prettier
- `marked` + `highlight.js` for markdown rendering, `pdfjs-dist` for pdf viewing
- Cloudflare Pages for hosting

## Project layout

```
src/
├── core/                 shared bootstrap + types
├── i18n/                 en/fr translations
├── layouts/BaseLayout.astro
├── pages/
│   ├── index.astro       shell switcher
│   └── api/contact.ts
└── shells/
    ├── desktop/          Windows XP shell (windowManager, apps, fs, clippy)
    └── ipod/             iPod shell (home screen, dock, apps)
```

Each shell owns its own components, apps registry, and bootstrap entry.

## Commands

| Command           | Action                               |
| :---------------- | :----------------------------------- |
| `npm install`     | Install dependencies                 |
| `npm run dev`     | Start dev server at `localhost:4321` |
| `npm run build`   | Build for production to `./dist/`    |
| `npm run preview` | Preview the production build         |
| `npm test`        | Run Vitest suite                     |
| `npm run lint`    | ESLint                               |
| `npm run format`  | Prettier                             |

Requires Node `>=22.12.0`.

## License

[MIT](./LICENSE) © Alexandre Vigneau
