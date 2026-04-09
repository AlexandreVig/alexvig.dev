import type { FileHandle } from '../fs/types';
import { windowManager } from '../lib/windowManager';
import type {
  AppHostAPI,
  AppInstance,
  AppManifest,
  AppMountContext,
} from './types';

interface HostLaunchRequest {
  appId: string;
  file: FileHandle | null;
  args?: Record<string, unknown>;
}

interface MountedEntry {
  manifest: AppManifest;
  instance: AppInstance;
  controller: AbortController;
  resizeObserver: ResizeObserver;
  focused: boolean;
}

class AppHost {
  private manifests = new Map<string, AppManifest>();
  private mounted = new Map<string, MountedEntry>();
  private loading = new Set<string>();
  private multiCounter = 0;

  init(apps: AppManifest[]): void {
    apps.forEach((app) => this.manifests.set(app.id, app));

    document.addEventListener('xp:close', (e) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      this.handleClose(id);
    });

    document.addEventListener('xp:minimize', (e) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      const entry = this.mounted.get(id);
      if (entry) {
        try {
          entry.instance.onMinimize?.();
        } catch (err) {
          console.error(`[appHost] onMinimize failed for "${id}":`, err);
        }
      }
      this.setFocused(id, false);
    });

    document.addEventListener('xp:restore', (e) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      const entry = this.mounted.get(id);
      if (entry) {
        try {
          entry.instance.onRestore?.();
        } catch (err) {
          console.error(`[appHost] onRestore failed for "${id}":`, err);
        }
      }
    });

    document.addEventListener('xp:taskbar-update', (e) => {
      const focusedId = (e as CustomEvent<{ focusedId: string | null }>).detail
        .focusedId;
      this.mounted.forEach((_, id) => {
        this.setFocused(id, id === focusedId);
      });
    });
  }

  async launch(req: HostLaunchRequest): Promise<void> {
    const manifest = this.manifests.get(req.appId);
    if (!manifest) {
      console.warn(`[appHost] unknown appId "${req.appId}"`);
      return;
    }

    const instanceId = this.computeInstanceId(manifest, req.file, req.args);

    // Already mounted → restore + focus, forward args if supplied.
    const existing = this.mounted.get(instanceId);
    if (existing) {
      if (windowManager.getState(instanceId)?.isMinimized) {
        windowManager.restore(instanceId);
      } else {
        windowManager.focus(instanceId);
      }
      if (req.args) {
        try {
          existing.instance.onLaunchArgs?.(req.args);
        } catch (err) {
          console.error(`[appHost] onLaunchArgs failed for "${instanceId}":`, err);
        }
      }
      return;
    }

    // Guard against rapid double-launch while the loader is in flight.
    if (this.loading.has(instanceId)) return;
    this.loading.add(instanceId);

    try {
      const mod = await manifest.loader();

      // Race guard: if unmounted or re-requested during load, bail gracefully.
      if (!this.loading.has(instanceId)) return;

      const title = req.file
        ? `${req.file.name} — ${manifest.title}`
        : manifest.title;
      const icon = req.file?.icon || manifest.icon;

      const body = windowManager.create({
        instanceId,
        title,
        icon,
        width: manifest.defaultWidth,
        height: manifest.defaultHeight,
      });

      const controller = new AbortController();
      const api: AppHostAPI = {
        setTitle: (t) => windowManager.setTitle(instanceId, t),
        close: () =>
          document.dispatchEvent(
            new CustomEvent('xp:close', { detail: { id: instanceId } }),
          ),
      };
      const ctx: AppMountContext = {
        root: body,
        instanceId,
        file: req.file,
        args: req.args ?? {},
        host: api,
        signal: controller.signal,
      };

      const instanceOrVoid = await mod.default.mount(ctx);
      const instance: AppInstance = (instanceOrVoid ?? {}) as AppInstance;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width === 0 && height === 0) continue;
          try {
            instance.onResize?.(width, height);
          } catch (err) {
            console.error(`[appHost] onResize failed for "${instanceId}":`, err);
          }
        }
      });
      resizeObserver.observe(body);

      this.mounted.set(instanceId, {
        manifest,
        instance,
        controller,
        resizeObserver,
        focused: false,
      });
    } catch (err) {
      console.error(`[appHost] failed to launch "${req.appId}":`, err);
    } finally {
      this.loading.delete(instanceId);
    }
  }

  private handleClose(id: string): void {
    this.loading.delete(id);
    const entry = this.mounted.get(id);
    if (!entry) {
      // May be called for a window that was never mounted as an app — still destroy it.
      windowManager.destroy(id);
      return;
    }
    entry.resizeObserver.disconnect();
    try {
      entry.instance.unmount?.();
    } catch (err) {
      console.error(`[appHost] unmount failed for "${id}":`, err);
    }
    entry.controller.abort();
    this.mounted.delete(id);
    windowManager.destroy(id);
  }

  private setFocused(id: string, focused: boolean): void {
    const entry = this.mounted.get(id);
    if (!entry || entry.focused === focused) return;
    entry.focused = focused;
    try {
      if (focused) entry.instance.onFocus?.();
      else entry.instance.onBlur?.();
    } catch (err) {
      console.error(`[appHost] focus hook failed for "${id}":`, err);
    }
  }

  private computeInstanceId(
    manifest: AppManifest,
    file: FileHandle | null,
    args: Record<string, unknown> | undefined,
  ): string {
    if (manifest.kind === 'singleton') return manifest.id;
    if (manifest.kind === 'multi') return `${manifest.id}#${++this.multiCounter}`;
    // document: key by file path, or (for folder-aware apps) by args.path
    const argsPath = typeof args?.path === 'string' ? (args.path as string) : '';
    const key = file?.path ?? argsPath;
    return `${manifest.id}:${key}`;
  }
}

export const appHost = new AppHost();
