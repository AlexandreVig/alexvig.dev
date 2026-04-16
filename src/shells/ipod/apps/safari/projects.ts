/**
 * Safari project registry.
 *
 * Two project types:
 *  - MarkdownProject: lazy-loads a .md file and renders it as a page
 *  - PdfProject: points at a static PDF URL and renders it with the shared
 *    pdf-viewer engine
 *
 * To add a markdown project:
 *   1. Drop the markdown file into `src/content/projects/`.
 *   2. Append a MarkdownProject entry below.
 *
 * To add a PDF project:
 *   1. Drop the PDF into `public/pdf/`.
 *   2. Append a PdfProject entry with its `pdfUrl`.
 */

import { getLocale } from '../../../../i18n';

interface BaseProject {
  /** Stable id used for DOM hooks and row lookup. */
  id: string;
  /** Shown in the nav bar and as the bookmark row title. */
  title: string;
  /** Short blurb under the title on the Bookmarks list. */
  description: string;
  /** Fake URL shown in the Safari URL bar when the page is open. */
  url: string;
}

export interface MarkdownProject extends BaseProject {
  type: 'markdown';
  /**
   * Lazy loader for the project's markdown source. Dynamic-imported so each
   * project's content lands in its own Vite chunk.
   */
  load: () => Promise<string>;
}

export interface PdfProject extends BaseProject {
  type: 'pdf';
  /** Absolute path to the PDF served from `public/`. */
  pdfUrl: string;
}

export type Project = MarkdownProject | PdfProject;

export const PROJECTS: Project[] = [
  {
    id: 'portfolio',
    type: 'markdown',
    title: getLocale() === 'fr' ? 'Site portfolio' : 'Portfolio Website',
    description:
      getLocale() === 'fr'
        ? 'Ce site \u2014 un portfolio retro.'
        : 'This site \u2014 a retro portfolio.',
    url: 'alexandre.dev/projects/portfolio',
    load: () =>
      getLocale() === 'fr'
        ? import('../../../../content/fr/projects/portfolio.md?raw').then((m) => m.default)
        : import('../../../../content/projects/portfolio.md?raw').then((m) => m.default),
  },
  {
    id: 'myvpn',
    type: 'markdown',
    title: getLocale() === 'fr' ? 'Mon VPN' : 'MyVPN',
    description:
      getLocale() === 'fr'
        ? 'Une reimplémentation de WireGuard en Python.'
        : 'A WireGuard reimplementation in Python.',
    url: 'alexandre.dev/projects/myvpn',
    load: () =>
      getLocale() === 'fr'
        ? import('../../../../content/fr/projects/myvpn.md?raw').then((m) => m.default)
        : import('../../../../content/projects/myvpn.md?raw').then((m) => m.default),
  },
  {
    id: 'resume',
    type: 'pdf',
    title: getLocale() === 'fr' ? 'CV' : 'Resume',
    description: getLocale() === 'fr' ? 'Mon CV.' : 'My resume.',
    url: 'alexvig.dev/resume.pdf',
    pdfUrl: getLocale() === 'fr' ? '/pdf/resume-fr.pdf' : '/pdf/resume-en.pdf',
  },
];
