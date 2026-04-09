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
];
