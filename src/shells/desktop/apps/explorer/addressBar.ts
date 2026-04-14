import { buildLocationTree, displayPathFor, iconFor, parseAddress } from './address';

interface AddressBarOptions {
  addressCombo: HTMLElement;
  addressCaret: HTMLButtonElement;
  addressInput: HTMLInputElement;
  addressIcon: HTMLImageElement;
  goBtn: HTMLButtonElement;
  getCurrentPath: () => string;
  navigateTo: (path: string) => void;
  signal: AbortSignal;
}

export interface AddressBarController {
  syncToPath(path: string): void;
}

export function setupAddressBar(opts: AddressBarOptions): AddressBarController {
  const {
    addressCombo,
    addressCaret,
    addressInput,
    addressIcon,
    goBtn,
    getCurrentPath,
    navigateTo,
    signal,
  } = opts;

  const typedHistory: string[] = [];

  function commitAddress() {
    const raw = addressInput.value;
    const resolved = parseAddress(raw);
    const current = getCurrentPath();
    if (resolved !== null && resolved !== current) {
      const display = displayPathFor(resolved);
      const idx = typedHistory.indexOf(display);
      if (idx !== -1) typedHistory.splice(idx, 1);
      typedHistory.unshift(display);
      if (typedHistory.length > 10) typedHistory.length = 10;
      navigateTo(resolved);
    } else {
      addressInput.value = displayPathFor(current);
    }
  }

  addressInput.addEventListener('focus', () => addressInput.select(), { signal });
  addressInput.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitAddress();
        addressInput.blur();
      } else if (e.key === 'Escape') {
        addressInput.value = displayPathFor(getCurrentPath());
        addressInput.blur();
      }
    },
    { signal },
  );
  goBtn.addEventListener('click', () => commitAddress(), { signal });

  // Dropdown
  let openDropdown: HTMLElement | null = null;

  function closeDropdown() {
    if (openDropdown) {
      openDropdown.remove();
      openDropdown = null;
      addressCaret.classList.remove('is-active');
    }
  }

  function toggleDropdown() {
    if (openDropdown) {
      closeDropdown();
      return;
    }
    const panel = document.createElement('div');
    panel.className = 'explorer__address-dropdown';
    panel.addEventListener('mousedown', (e) => e.stopPropagation());

    const current = getCurrentPath();
    const addRow = (path: string, display: string, icon: string, depth: number) => {
      const row = document.createElement('div');
      row.className = 'explorer__address-dropdown-row';
      if (path === current) row.classList.add('is-current');
      row.style.paddingLeft = `${6 + depth * 16}px`;
      const img = document.createElement('img');
      img.src = icon;
      img.alt = '';
      const label = document.createElement('span');
      label.textContent = display;
      row.appendChild(img);
      row.appendChild(label);
      row.addEventListener('click', () => {
        closeDropdown();
        if (path !== getCurrentPath()) navigateTo(path);
      });
      panel.appendChild(row);
    };

    const seenTyped = new Set<string>();
    let historyShown = 0;
    for (const display of typedHistory) {
      const p = parseAddress(display);
      if (!p || seenTyped.has(p)) continue;
      seenTyped.add(p);
      addRow(p, display, iconFor(p), 0);
      historyShown++;
    }
    if (historyShown > 0) {
      const sep = document.createElement('div');
      sep.className = 'explorer__address-dropdown-separator';
      panel.appendChild(sep);
    }

    for (const entry of buildLocationTree()) {
      addRow(entry.path, entry.display, entry.icon, entry.depth);
    }

    addressCombo.appendChild(panel);
    openDropdown = panel;
    addressCaret.classList.add('is-active');
  }

  addressCaret.addEventListener(
    'mousedown',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    },
    { signal },
  );
  document.addEventListener(
    'mousedown',
    (e) => {
      if (openDropdown && !addressCombo.contains(e.target as Node)) {
        closeDropdown();
      }
    },
    { signal },
  );
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') closeDropdown();
    },
    { signal },
  );

  return {
    syncToPath(path) {
      addressInput.value = displayPathFor(path);
      addressIcon.src = iconFor(path);
    },
  };
}
