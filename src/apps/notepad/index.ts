import type { AppModule } from '../types';
import { escapeHtml, renderMarkdown } from './render';
import './notepad.css';

const mod: AppModule = {
  async mount({ root, file, host }) {
    root.classList.add('notepad');

    if (!file) {
      root.innerHTML =
        '<div class="notepad__menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>' +
        '<div class="notepad__body"><div class="notepad__empty">Untitled</div></div>';
      return {};
    }

    host.setTitle(`${file.name} — Notepad`);

    const source = await file.read();
    const html =
      file.ext === '.md'
        ? await renderMarkdown(source)
        : `<pre>${escapeHtml(source)}</pre>`;

    root.innerHTML =
      '<div class="notepad__menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>' +
      `<div class="notepad__body">${html}</div>`;

    return {
      unmount() {
        root.classList.remove('notepad');
        root.innerHTML = '';
      },
    };
  },
};

export default mod;
