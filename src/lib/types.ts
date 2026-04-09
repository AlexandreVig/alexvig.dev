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
  /** Unique per-window-instance id (e.g. "explorer", "notepad:/Desktop/About.md"). */
  id: string;
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
  openedAt?: number;
}

export interface XpEventDetail {
  id: string;
}

export type XpEventName =
  | 'xp:launch'
  | 'xp:close'
  | 'xp:minimize'
  | 'xp:maximize'
  | 'xp:focus'
  | 'xp:restore'
  | 'xp:taskbar-update';
