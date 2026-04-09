import type { AppManifest } from './types';

export const apps: AppManifest[] = [
  {
    id: 'explorer',
    title: 'My Computer',
    icon: '/icons/my-computer.png',
    defaultWidth: 640,
    defaultHeight: 440,
    kind: 'document',
    showInStartMenu: true,
    loader: () => import('./explorer'),
  },
  {
    id: 'notepad',
    title: 'Notepad',
    icon: '/icons/notepad.png',
    defaultWidth: 560,
    defaultHeight: 440,
    kind: 'document',
    acceptsFileTypes: ['.md', '.txt'],
    showInStartMenu: false,
    loader: () => import('./notepad'),
  },
  {
    id: 'about',
    title: 'About',
    icon: '/icons/notepad.png',
    defaultWidth: 420,
    defaultHeight: 320,
    // Keyed by args.path (e.g. "about:notepad") so each parent app gets
    // at most one About dialog at a time.
    kind: 'document',
    showInStartMenu: false,
    // Dialog-style chrome: close button only, no title-bar icon, not resizable,
    // no taskbar entry.
    controls: ['close'],
    showWindowIcon: false,
    resizable: false,
    showInTaskbar: false,
    loader: () => import('./about'),
  },
];
