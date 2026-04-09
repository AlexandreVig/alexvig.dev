import { iconForNode, listChildren, parentPath, pathOf, resolve } from '../../fs/api';
import type { FsNode } from '../../fs/types';
import { launch } from '../../shell/launcher';
import type { AppModule } from '../types';
import './explorer.css';

const mod: AppModule = {
  mount({ root, args, host }) {
    const initialPath =
      typeof args.path === 'string' && resolve(args.path) ? (args.path as string) : '/';

    let currentPath = initialPath;
    const history: string[] = [];

    root.classList.add('explorer');
    root.innerHTML = `
      <div class="explorer__toolbar">
        <button class="explorer__btn" data-action="back" disabled>&larr; Back</button>
        <button class="explorer__btn" data-action="up">&uarr; Up</button>
      </div>
      <div class="explorer__address">
        <span class="explorer__address-label">Address</span>
        <input class="explorer__address-input" type="text" readonly />
      </div>
      <div class="explorer__body"></div>
      <div class="explorer__status"></div>
    `;

    const backBtn = root.querySelector<HTMLButtonElement>('[data-action="back"]')!;
    const upBtn = root.querySelector<HTMLButtonElement>('[data-action="up"]')!;
    const addressInput = root.querySelector<HTMLInputElement>('.explorer__address-input')!;
    const body = root.querySelector<HTMLElement>('.explorer__body')!;
    const status = root.querySelector<HTMLElement>('.explorer__status')!;

    function render() {
      addressInput.value = currentPath;
      backBtn.disabled = history.length === 0;
      upBtn.disabled = currentPath === '/';

      const children = listChildren(currentPath);
      body.innerHTML = '';

      if (children.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'explorer__empty';
        empty.textContent = 'This folder is empty.';
        body.appendChild(empty);
      } else {
        for (const node of children) {
          body.appendChild(renderItem(node));
        }
      }

      status.textContent = `${children.length} item${children.length === 1 ? '' : 's'}`;

      const node = resolve(currentPath);
      const title = currentPath === '/' ? 'My Computer' : node?.name ?? currentPath;
      host.setTitle(title);
    }

    function renderItem(node: FsNode): HTMLElement {
      const item = document.createElement('div');
      item.className = 'explorer__item';
      if (node.kind === 'shortcut') item.classList.add('is-shortcut');

      const iconWrap = document.createElement('span');
      iconWrap.className = 'explorer__item-icon-wrap';
      const img = document.createElement('img');
      img.className = 'explorer__item-icon';
      img.src = iconForNode(node);
      img.alt = '';
      iconWrap.appendChild(img);
      item.appendChild(iconWrap);

      const label = document.createElement('div');
      label.className = 'explorer__item-label';
      label.textContent = node.name;
      item.appendChild(label);

      let clickTimer: ReturnType<typeof setTimeout> | null = null;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        body.querySelectorAll('.explorer__item.is-selected').forEach((el) =>
          el.classList.remove('is-selected'),
        );
        item.classList.add('is-selected');

        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
          activate(node);
        } else {
          clickTimer = setTimeout(() => {
            clickTimer = null;
          }, 400);
        }
      });

      return item;
    }

    function activate(node: FsNode) {
      if (node.kind === 'folder') {
        navigateTo(pathOf(currentPath, node));
      } else if (node.kind === 'file') {
        void launch({ path: pathOf(currentPath, node) });
      } else if (node.kind === 'shortcut') {
        void launch({ appId: node.target.appId, path: node.target.path });
      }
    }

    function navigateTo(path: string) {
      history.push(currentPath);
      currentPath = path;
      render();
    }

    backBtn.addEventListener('click', () => {
      const prev = history.pop();
      if (prev !== undefined) {
        currentPath = prev;
        render();
      }
    });

    upBtn.addEventListener('click', () => {
      if (currentPath === '/') return;
      history.push(currentPath);
      currentPath = parentPath(currentPath);
      render();
    });

    body.addEventListener('click', (e) => {
      if (e.target === body) {
        body.querySelectorAll('.explorer__item.is-selected').forEach((el) =>
          el.classList.remove('is-selected'),
        );
      }
    });

    render();

    return {
      onLaunchArgs(newArgs) {
        // Instance keying already dedupes by start path, so most onLaunchArgs
        // calls arrive with the same path — only navigate on a real change.
        if (
          typeof newArgs.path === 'string' &&
          newArgs.path !== currentPath &&
          resolve(newArgs.path)
        ) {
          history.push(currentPath);
          currentPath = newArgs.path;
          render();
        }
      },
      unmount() {
        root.classList.remove('explorer');
        root.innerHTML = '';
      },
    };
  },
};

export default mod;
