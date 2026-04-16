/**
 * Shared PDF rendering engine.
 *
 * Used by both the desktop Adobe Reader app and the iPod Safari PDF branch.
 * Handles: pdfjs loading, canvas grid, lazy rendering via IntersectionObserver,
 * link overlays, zoom (with fit-width floor), scroll tracking, and cleanup.
 *
 * Usage:
 *   const viewer = await createPdfViewer({ url, container, signal, ... });
 *   viewer.setZoom('fit-width');
 *   viewer.destroy(); // or let signal abort handle it
 */

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './pdf-viewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
/** Maximum zoom allowed when pinch-zooming in (3× the base scale). */
export const ZOOM_MAX = 3.0;

export type ZoomMode = number | 'fit-width' | 'fit-page';

export interface PdfViewerOptions {
  /** Absolute URL of the PDF to load, e.g. '/pdf/resume-en.pdf' */
  url: string;
  /** The scrollable container element the viewer renders into */
  container: HTMLElement;
  /** Aborted on unmount — the viewer cleans up automatically */
  signal: AbortSignal;
  /** Initial zoom mode. Defaults to 'fit-width'. */
  initialZoom?: ZoomMode;
  /** Fired whenever the tracked visible page changes */
  onPageChange?: (page: number, total: number) => void;
  /** Fired whenever the resolved zoom scale changes */
  onZoomChange?: (zoom: number) => void;
}

export interface PdfViewerHandle {
  /** Change zoom mode. 'fit-width' and 'fit-page' are responsive; numbers are fixed. */
  setZoom(mode: ZoomMode): void;
  /** Step to the next higher zoom preset. */
  zoomIn(): void;
  /** Step to the next lower zoom preset, floored at fit-width scale. */
  zoomOut(): void;
  /** Smooth-scroll to the given 1-indexed page number. */
  scrollToPage(page: number): void;
  /** Call from a window/app resize handler — no-op if zoom is a fixed number. */
  onResize(): void;
  /** Returns the current resolved zoom scale (CSS pixels per PDF point). */
  getCurrentZoom(): number;
  /**
   * Returns the scale that would result from fit-width, without changing the
   * current zoom mode. Useful for clamping pinch-zoom to the fit-width floor.
   */
  getFitWidthScale(): number;
  /** Tear down the viewer: disconnect observer, destroy pdfjs task, clear timers. */
  destroy(): void;
}

export async function createPdfViewer(opts: PdfViewerOptions): Promise<PdfViewerHandle> {
  const { url, container, signal, initialZoom = 'fit-width' } = opts;

  // ── State ────────────────────────────────────────────────────────────────
  let currentPage = 1;
  let totalPages = 0;
  let currentZoom = 1.0;
  let zoomMode: ZoomMode = initialZoom;
  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  const rendered = new Set<number>();
  const rendering = new Set<number>();
  const canvases: HTMLCanvasElement[] = [];
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let observer: IntersectionObserver | null = null;
  let zoomGeneration = 0;
  let destroyed = false;

  // ── DOM setup ─────────────────────────────────────────────────────────────
  const pageContainer = document.createElement('div');
  pageContainer.className = 'ar__page-container';
  pageContainer.innerHTML = '<div class="ar__loading">Loading…</div>';
  container.appendChild(pageContainer);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    if (resizeTimer) clearTimeout(resizeTimer);
    loadingTask.destroy();
    pageContainer.remove();
    pdfDoc = null;
  }

  signal.addEventListener('abort', cleanup, { once: true });

  // ── Load PDF ──────────────────────────────────────────────────────────────
  const loadingTask = pdfjsLib.getDocument(url);

  try {
    pdfDoc = await loadingTask.promise;
  } catch {
    // Aborted or failed — return a no-op handle so callers don't crash.
    return makeHandle();
  }

  if (signal.aborted || !pdfDoc) return makeHandle();

  totalPages = pdfDoc.numPages;
  pageContainer.innerHTML = '';

  // ── Canvas grid ───────────────────────────────────────────────────────────
  for (let i = 1; i <= totalPages; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ar__page-wrapper';

    const canvas = document.createElement('canvas');
    canvas.className = 'ar__page';
    canvas.dataset.page = String(i);

    wrapper.appendChild(canvas);
    pageContainer.appendChild(wrapper);
    canvases.push(canvas);
  }

  const firstPage = await pdfDoc.getPage(1);
  const baseViewport = firstPage.getViewport({ scale: 1 });
  const pageAspect = baseViewport.width / baseViewport.height;

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  function computeFitWidthScale(): number {
    const availWidth = container.clientWidth - 16; // 8px padding each side
    return availWidth / baseViewport.width;
  }

  function computeScale(): number {
    if (zoomMode === 'fit-width') return computeFitWidthScale();
    if (zoomMode === 'fit-page') {
      const availWidth = container.clientWidth - 16;
      const availHeight = container.clientHeight - 16;
      return Math.min(availWidth / baseViewport.width, availHeight / baseViewport.height);
    }
    return zoomMode as number;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  async function renderPage(pageNum: number) {
    if (!pdfDoc || rendering.has(pageNum) || signal.aborted) return;
    rendering.add(pageNum);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const dpr = window.devicePixelRatio || 1;
      const pv = page.getViewport({ scale: currentZoom * dpr });
      const canvas = canvases[pageNum - 1];
      if (!canvas) return;

      canvas.width = Math.floor(pv.width);
      canvas.height = Math.floor(pv.height);
      canvas.style.width = `${Math.floor(pv.width / dpr)}px`;
      canvas.style.height = `${Math.floor(pv.height / dpr)}px`;

      await page.render({ canvas, viewport: pv }).promise;
      rendered.add(pageNum);
      await overlayLinks(page, canvas, currentZoom);
    } finally {
      rendering.delete(pageNum);
    }
  }

  async function overlayLinks(
    page: pdfjsLib.PDFPageProxy,
    canvas: HTMLCanvasElement,
    zoom: number,
  ) {
    canvas.parentElement
      ?.querySelectorAll(`.ar__link-layer[data-page="${canvas.dataset.page}"]`)
      .forEach((el) => el.remove());

    const annotations = await page.getAnnotations();
    const links = annotations.filter((a) => a.subtype === 'Link' && a.url);
    if (links.length === 0) return;

    const pv = page.getViewport({ scale: zoom });
    const layer = document.createElement('div');
    layer.className = 'ar__link-layer';
    layer.dataset.page = canvas.dataset.page;
    layer.style.width = canvas.style.width;
    layer.style.height = canvas.style.height;

    for (const ann of links) {
      const [x1, y1, x2, y2] = ann.rect as [number, number, number, number];
      const left = x1 * zoom;
      const top = pv.height - y2 * zoom;
      const width = (x2 - x1) * zoom;
      const height = (y2 - y1) * zoom;

      const a = document.createElement('a');
      a.href = ann.url as string;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.className = 'ar__link';
      a.style.left = `${left}px`;
      a.style.top = `${top}px`;
      a.style.width = `${width}px`;
      a.style.height = `${height}px`;
      layer.appendChild(a);
    }

    canvas.parentElement!.appendChild(layer);
  }

  function sizeAllCanvases() {
    const cssWidth = Math.floor(baseViewport.width * currentZoom);
    const cssHeight = Math.floor(cssWidth / pageAspect);
    for (const canvas of canvases) {
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    }
  }

  async function applyZoom() {
    const gen = ++zoomGeneration;
    currentZoom = computeScale();
    opts.onZoomChange?.(currentZoom);
    rendered.clear();
    rendering.clear();
    sizeAllCanvases();

    for (const canvas of canvases) {
      if (gen !== zoomGeneration || signal.aborted) return;
      if (isVisible(canvas)) {
        const pageNum = parseInt(canvas.dataset.page!, 10);
        await renderPage(pageNum);
      }
    }
  }

  function isVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const vpRect = container.getBoundingClientRect();
    return rect.bottom > vpRect.top && rect.top < vpRect.bottom;
  }

  // ── IntersectionObserver ──────────────────────────────────────────────────
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const pageNum = parseInt((entry.target as HTMLElement).dataset.page!, 10);
        if (entry.isIntersecting) {
          if (!rendered.has(pageNum)) void renderPage(pageNum);
          if (entry.intersectionRatio > 0.3 || entry.boundingClientRect.top >= 0) {
            if (pageNum !== currentPage) {
              currentPage = pageNum;
              opts.onPageChange?.(currentPage, totalPages);
            }
          }
        }
      }
    },
    { root: container, threshold: [0, 0.3, 0.5] },
  );

  for (const canvas of canvases) observer.observe(canvas);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  container.addEventListener(
    'scroll',
    () => {
      let bestPage = 1;
      let bestDist = Infinity;
      const vpTop = container.getBoundingClientRect().top;
      for (let i = 0; i < canvases.length; i++) {
        const dist = Math.abs(canvases[i]!.getBoundingClientRect().top - vpTop);
        if (dist < bestDist) {
          bestDist = dist;
          bestPage = i + 1;
        }
      }
      if (bestPage !== currentPage) {
        currentPage = bestPage;
        opts.onPageChange?.(currentPage, totalPages);
      }
    },
    { signal, passive: true },
  );

  // ── Initial render ────────────────────────────────────────────────────────
  currentZoom = computeScale();
  opts.onZoomChange?.(currentZoom);
  opts.onPageChange?.(1, totalPages);
  sizeAllCanvases();
  await renderPage(1);

  // ── Handle object ─────────────────────────────────────────────────────────
  function makeHandle(): PdfViewerHandle {
    return {
      setZoom(mode: ZoomMode) {
        zoomMode = mode;
        void applyZoom();
      },
      zoomIn() {
        const idx = ZOOM_PRESETS.findIndex((z) => z > currentZoom + 0.01);
        const next = ZOOM_PRESETS[idx];
        if (idx !== -1 && next !== undefined) {
          zoomMode = next;
          void applyZoom();
        }
      },
      zoomOut() {
        const candidates = ZOOM_PRESETS.filter((z) => z < currentZoom - 0.01);
        const last = candidates[candidates.length - 1];
        if (last !== undefined) {
          zoomMode = last;
          void applyZoom();
        }
      },
      scrollToPage(page: number) {
        const canvas = canvases[page - 1];
        if (canvas) {
          canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
          currentPage = page;
          opts.onPageChange?.(currentPage, totalPages);
        }
      },
      onResize() {
        if (typeof zoomMode === 'number') return;
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => void applyZoom(), 100);
      },
      getCurrentZoom() {
        return currentZoom;
      },
      getFitWidthScale() {
        return computeFitWidthScale();
      },
      destroy() {
        cleanup();
      },
    };
  }

  return makeHandle();
}
