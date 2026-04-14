export interface FileTypeDef {
  ext: string;
  icon: string;
  defaultAppId: string;
  displayName: string;
}

const registry: Record<string, FileTypeDef> = {
  '.md': {
    ext: '.md',
    icon: '/icons/notepad.webp',
    defaultAppId: 'notepad',
    displayName: 'Markdown Document',
  },
  '.txt': {
    ext: '.txt',
    icon: '/icons/notepad.webp',
    defaultAppId: 'notepad',
    displayName: 'Text Document',
  },
  '.pdf': {
    ext: '.pdf',
    icon: '/icons/pdf-file.webp',
    defaultAppId: 'adobe-reader',
    displayName: 'PDF Document',
  },
  '.exe': {
    ext: '.exe',
    icon: '/icons/notepad.webp',
    defaultAppId: 'bsod',
    displayName: 'Application',
  },
};

const FALLBACK: FileTypeDef = {
  ext: '',
  icon: '/icons/notepad.webp',
  defaultAppId: 'notepad',
  displayName: 'File',
};

export function getFileType(ext: string): FileTypeDef {
  return registry[ext.toLowerCase()] ?? FALLBACK;
}
