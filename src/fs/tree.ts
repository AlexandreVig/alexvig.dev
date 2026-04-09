import type { FolderNode } from './types';

export const root: FolderNode = {
  kind: 'folder',
  name: '/',
  children: [
    {
      kind: 'folder',
      name: 'Desktop',
      icon: '/icons/folder-32.png',
      children: [
        {
          kind: 'shortcut',
          name: 'My Computer',
          icon: '/icons/my-computer.png',
          target: { appId: 'explorer', path: '/' },
        },
        {
          kind: 'shortcut',
          name: 'My Documents',
          icon: '/icons/folder-32.png',
          target: { appId: 'explorer', path: '/My Documents' },
        },
        {
          kind: 'file',
          name: 'About Me.md',
          icon: '/icons/user.png',
          ext: '.md',
          load: () => import('../content/about.md?raw').then((m) => m.default),
        },
        {
          kind: 'file',
          name: 'Contact.md',
          icon: '/icons/mail.png',
          ext: '.md',
          load: () => import('../content/contact.md?raw').then((m) => m.default),
        },
      ],
    },
    {
      kind: 'folder',
      name: 'My Documents',
      icon: '/icons/folder-32.png',
      children: [
        {
          kind: 'folder',
          name: 'Projects',
          icon: '/icons/folder-32.png',
          children: [
            {
              kind: 'file',
              name: 'Portfolio Website.md',
              ext: '.md',
              load: () =>
                import('../content/projects/portfolio.md?raw').then((m) => m.default),
            },
          ],
        },
        {
          kind: 'file',
          name: 'Skills.md',
          icon: '/icons/notepad.png',
          ext: '.md',
          load: () => import('../content/skills.md?raw').then((m) => m.default),
        },
        {
          kind: 'file',
          name: 'Contact.md',
          icon: '/icons/mail.png',
          ext: '.md',
          load: () => import('../content/contact.md?raw').then((m) => m.default),
        },
        {
          kind: 'file',
          name: 'About Me.md',
          icon: '/icons/user.png',
          ext: '.md',
          load: () => import('../content/about.md?raw').then((m) => m.default),
        },
      ],
    },
  ],
};
