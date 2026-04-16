import { createPdfViewer } from '../../../../core/pdf-viewer';
import { openAbout } from '../about/launch';
import type { AppModule, AppInstance } from '../types';
import { createMenu } from './menu';
import { createToolbar } from './toolbar';
import './adobe-reader.css';
import { t } from '../../../../i18n';

const mod: AppModule = {
  async mount({ root, file, host, signal }) {
    root.classList.add('adobe-reader');

    if (!file) {
      root.innerHTML = '<div class="ar__loading">No file specified.</div>';
      return {
        unmount() {
          root.classList.remove('adobe-reader');
          root.innerHTML = '';
        },
      };
    }

    host.setTitle(`${file.name} — Adobe Reader`);

    const pdfUrl = await file.read();

    // ── Helper actions ──────────────────────────────────────────────────────
    function printPdf() {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1000);
      };
    }

    function savePdf() {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = file!.name;
      a.click();
    }

    // ── Toolbar ─────────────────────────────────────────────────────────────
    // Viewer is created after toolbar so callbacks can reference it via closure.
    let viewer: Awaited<ReturnType<typeof createPdfViewer>> | null = null;

    const toolbar = createToolbar({
      onPrint: printPdf,
      onSave: savePdf,
      onPrevPage() {
        viewer?.scrollToPage(Math.max(1, currentPage - 1));
      },
      onNextPage() {
        viewer?.scrollToPage(currentPage + 1);
      },
      onGoToPage(page) {
        viewer?.scrollToPage(page);
      },
      onZoomChange(val) {
        viewer?.setZoom(val);
      },
      onZoomIn() {
        viewer?.zoomIn();
      },
      onZoomOut() {
        viewer?.zoomOut();
      },
    });

    // Track current page for toolbar prev/next buttons
    let currentPage = 1;

    // ── Menu ─────────────────────────────────────────────────────────────────
    const menuBar = createMenu(
      {
        onAction(action) {
          switch (action) {
            case 'exit':
              host.close();
              break;
            case 'save':
              savePdf();
              break;
            case 'print':
              printPdf();
              break;
            case 'fit-page':
              viewer?.setZoom('fit-page');
              break;
            case 'fit-width':
              viewer?.setZoom('fit-width');
              break;
            case 'zoom-in':
              viewer?.zoomIn();
              break;
            case 'zoom-out':
              viewer?.zoomOut();
              break;
            case 'about':
              openAbout('adobe-reader', {
                icon: '/icons/adobe-reader.webp',
                appIcon: '/icons/adobe-reader.webp',
                appTitle: 'Adobe Reader',
                version: 'Version 7.0',
                copyright: '\u00a9 2026 Alexandre Vigneau',
                description: t('reader.about.description'),
                footer: t('reader.about.footer'),
              });
              break;
          }
        },
      },
      signal,
    );

    // ── Viewport ─────────────────────────────────────────────────────────────
    const viewport = document.createElement('div');
    viewport.className = 'ar__viewport';

    root.appendChild(menuBar);
    root.appendChild(toolbar.element);
    root.appendChild(viewport);

    // ── AppInstance (returned before viewer loads so host can tear down) ─────
    const instance: AppInstance = {
      unmount() {
        viewer?.destroy();
        root.classList.remove('adobe-reader');
        root.innerHTML = '';
      },
      onResize() {
        viewer?.onResize();
      },
    };

    // ── Create viewer ─────────────────────────────────────────────────────────
    viewer = await createPdfViewer({
      url: pdfUrl,
      container: viewport,
      signal,
      initialZoom: 'fit-width',
      onPageChange(page, total) {
        currentPage = page;
        toolbar.setPage(page, total);
      },
      onZoomChange(zoom) {
        toolbar.setZoom(zoom);
      },
    });

    return instance;
  },
};

export default mod;
