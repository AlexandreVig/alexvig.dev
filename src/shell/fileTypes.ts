export interface FileTypeDef {
  ext: string;
  icon: string;
  defaultAppId: string;
  displayName: string;
}

const registry: Record<string, FileTypeDef> = {
  '.md': {
    ext: '.md',
    icon: '/icons/notepad.png',
    defaultAppId: 'notepad',
    displayName: 'Markdown Document',
  },
  '.txt': {
    ext: '.txt',
    icon: '/icons/notepad.png',
    defaultAppId: 'notepad',
    displayName: 'Text Document',
  },
};

const FALLBACK: FileTypeDef = {
  ext: '',
  icon: '/icons/notepad.png',
  defaultAppId: 'notepad',
  displayName: 'File',
};

export function getFileType(ext: string): FileTypeDef {
  return registry[ext.toLowerCase()] ?? FALLBACK;
}
