import type { AppModule } from '../types';
import type { FolderId } from './types';
import { folders, emails, contacts } from './data';
import { createMenu } from './menu';
import { launch } from '../../shell/launcher';
import './outlook.css';

const mod: AppModule = {
  mount({ root, host, signal }) {
    let currentFolder: FolderId = 'inbox';
    let selectedEmailId: string | null = null;

    root.classList.add('outlook');
    root.innerHTML = `
      <div class="outlook__menubar">
        <div class="outlook__menu-host"></div>
      </div>

      <div class="outlook__toolbar">
        <button class="outlook__tbtn" data-action="create-mail">
          <img src="/icons/outlook/create-mail.png" alt="" />
          <span>Create Mail</span>
        </button>
        <div class="outlook__tsep"></div>
        <button class="outlook__tbtn" data-action="reply" disabled>
          <img src="/icons/outlook/reply.png" alt="" />
          <span>Reply</span>
        </button>
        <button class="outlook__tbtn" data-action="reply-all" disabled>
          <img src="/icons/outlook/reply-all.png" alt="" />
          <span>Reply All</span>
        </button>
        <button class="outlook__tbtn" data-action="forward" disabled>
          <img src="/icons/outlook/forward.png" alt="" />
          <span>Forward</span>
        </button>
        <div class="outlook__tsep"></div>
        <button class="outlook__tbtn" data-action="print" disabled>
          <img src="/icons/outlook/print.png" alt="" />
          <span>Print</span>
        </button>
        <button class="outlook__tbtn" data-action="delete" disabled>
          <img src="/icons/outlook/delete.png" alt="" />
          <span>Delete</span>
        </button>
        <div class="outlook__tsep"></div>
        <button class="outlook__tbtn" data-action="send-recv" disabled>
          <img src="/icons/outlook/send-recv.png" alt="" />
          <span>Send/Recv</span>
        </button>
        <button class="outlook__tbtn" data-action="addresses" disabled>
          <img src="/icons/outlook/addresses.png" alt="" />
          <span>Addresses</span>
        </button>
        <button class="outlook__tbtn" data-action="find" disabled>
          <img src="/icons/outlook/find.png" alt="" />
          <span>Find</span>
        </button>
      </div>

      <div class="outlook__main">
        <div class="outlook__sidebar">
          <div class="outlook__folders">
            <div class="outlook__folders-header">Folders</div>
            <div class="outlook__folders-tree"></div>
          </div>
          <div class="outlook__contacts">
            <div class="outlook__contacts-header">Contacts</div>
            <div class="outlook__contacts-list"></div>
          </div>
        </div>
        <div class="outlook__content">
          <div class="outlook__list">
            <div class="outlook__list-header">
              <div class="outlook__list-col outlook__list-col--prio"></div>
              <div class="outlook__list-col outlook__list-col--attach"></div>
              <div class="outlook__list-col outlook__list-col--from">From</div>
              <div class="outlook__list-col outlook__list-col--subject">Subject</div>
              <div class="outlook__list-col outlook__list-col--date">Received</div>
            </div>
            <div class="outlook__list-body"></div>
          </div>
          <div class="outlook__reader"></div>
        </div>
      </div>

      <div class="outlook__status">
        <span class="outlook__status-count"></span>
        <span class="outlook__status-online">Working Online</span>
      </div>
    `;

    // ── Menu bar ──────────────────────────────────────────────────────────
    const menuHost = root.querySelector<HTMLElement>('.outlook__menu-host')!;
    menuHost.appendChild(
      createMenu(
        {
          onAction: (action) => {
            if (action === 'exit') host.close();
            else if (action === 'new-mail') openCompose();
            else if (action === 'refresh') render();
            else if (action === 'about') {
              void launch({
                appId: 'about',
                args: {
                  path: 'about:outlook',
                  icon: '/icons/outlook.png',
                  appIcon: '/icons/outlook.png',
                  appTitle: 'Outlook Express',
                  version: 'Version 6.0',
                  copyright: '\u00a9 2026 Alexandre Vigneau',
                  description:
                    'A Windows XP\u2013style email client, doubling as a contact form. ' +
                    'Part of this portfolio.',
                },
              });
            }
          },
        },
        signal,
      ),
    );

    // ── Toolbar actions ───────────────────────────────────────────────────
    root.addEventListener(
      'click',
      (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.action;
        if (action === 'create-mail') openCompose();
      },
      { signal },
    );

    // ── References ────────────────────────────────────────────────────────
    const foldersTree = root.querySelector<HTMLElement>('.outlook__folders-tree')!;
    const contactsList = root.querySelector<HTMLElement>('.outlook__contacts-list')!;
    const listBody = root.querySelector<HTMLElement>('.outlook__list-body')!;
    const reader = root.querySelector<HTMLElement>('.outlook__reader')!;
    const statusCount = root.querySelector<HTMLElement>('.outlook__status-count')!;

    // ── Render folders tree ───────────────────────────────────────────────
    function renderFolders(): void {
      foldersTree.innerHTML = '';

      // Root node
      const rootNode = document.createElement('div');
      rootNode.className = 'outlook__tree-node outlook__tree-node--root';
      rootNode.innerHTML = `
        <img src="/icons/outlook/local-folders.png" class="outlook__tree-icon" alt="" />
        <span>Outlook Express</span>
      `;
      foldersTree.appendChild(rootNode);

      for (const folder of folders) {
        const node = document.createElement('div');
        node.className = 'outlook__tree-node outlook__tree-node--child';
        if (folder.id === currentFolder) node.classList.add('outlook__tree-node--active');

        const unreadBadge = folder.unread ? ` (${folder.unread})` : '';
        const bold = folder.unread ? ' outlook__tree-label--bold' : '';
        node.innerHTML = `
          <img src="${folder.icon}" class="outlook__tree-icon" alt="" />
          <span class="outlook__tree-label${bold}">${folder.name}${unreadBadge}</span>
        `;
        node.addEventListener(
          'click',
          () => {
            currentFolder = folder.id;
            selectedEmailId = null;
            render();
          },
          { signal },
        );
        foldersTree.appendChild(node);
      }
    }

    // ── Render contacts panel ─────────────────────────────────────────────
    function renderContacts(): void {
      contactsList.innerHTML = '';
      const note = document.createElement('div');
      note.className = 'outlook__contacts-note';
      note.textContent =
        'There are no contacts to display. Click on Contacts to create a new contact.';
      // Only show note if no contacts
      if (contacts.length === 0) {
        contactsList.appendChild(note);
        return;
      }
      for (const contact of contacts) {
        const item = document.createElement('div');
        item.className = 'outlook__contact-item';
        item.innerHTML = `
          <img src="${contact.icon}" class="outlook__contact-icon" alt="" />
          <span>${contact.name}</span>
        `;
        contactsList.appendChild(item);
      }
    }

    // ── Render email list ─────────────────────────────────────────────────
    function renderList(): void {
      listBody.innerHTML = '';
      const folderEmails = emails.filter((e) => e.folder === currentFolder);

      if (folderEmails.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'outlook__list-empty';
        empty.textContent = 'There are no items to show in this view.';
        listBody.appendChild(empty);
        statusCount.textContent = '0 message(s)';
        return;
      }

      // Sort by date desc
      folderEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Auto-select first email
      if (!selectedEmailId || !folderEmails.find((e) => e.id === selectedEmailId)) {
        selectedEmailId = folderEmails[0].id;
      }

      for (const email of folderEmails) {
        const row = document.createElement('div');
        row.className = 'outlook__list-row';
        if (email.unread) row.classList.add('outlook__list-row--unread');
        if (email.id === selectedEmailId) row.classList.add('outlook__list-row--selected');

        const iconSrc = email.unread
          ? '/icons/outlook/email-unread.png'
          : '/icons/outlook/email-read.png';

        const dateStr = formatDate(email.date);

        row.innerHTML = `
          <div class="outlook__list-cell outlook__list-cell--prio">
            <img src="${iconSrc}" class="outlook__list-mail-icon" alt="" />
          </div>
          <div class="outlook__list-cell outlook__list-cell--attach"></div>
          <div class="outlook__list-cell outlook__list-cell--from">${escapeHtml(email.from.name)}</div>
          <div class="outlook__list-cell outlook__list-cell--subject">${escapeHtml(email.subject)}</div>
          <div class="outlook__list-cell outlook__list-cell--date">${dateStr}</div>
        `;

        row.addEventListener(
          'click',
          () => {
            selectedEmailId = email.id;
            render();
          },
          { signal },
        );
        row.addEventListener(
          'dblclick',
          () => {
            selectedEmailId = email.id;
            render();
          },
          { signal },
        );

        listBody.appendChild(row);
      }

      const unreadCount = folderEmails.filter((e) => e.unread).length;
      statusCount.textContent = `${folderEmails.length} message(s), ${unreadCount} unread`;
    }

    // ── Render reading pane ───────────────────────────────────────────────
    function renderReader(): void {
      const email = selectedEmailId ? emails.find((e) => e.id === selectedEmailId) : null;
      if (!email) {
        reader.innerHTML = '';
        return;
      }

      reader.innerHTML = `
        <div class="outlook__reader-header">
          <div class="outlook__reader-field">
            <b>From:</b>&nbsp; ${escapeHtml(email.from.name)} &lt;${escapeHtml(email.from.email)}&gt;
          </div>
          <div class="outlook__reader-field">
            <b>Date:</b>&nbsp; ${new Date(email.date).toLocaleString()}
          </div>
          <div class="outlook__reader-field">
            <b>To:</b>&nbsp; ${escapeHtml(email.to)}
          </div>
          <div class="outlook__reader-field">
            <b>Subject:</b>&nbsp; ${escapeHtml(email.subject)}
          </div>
        </div>
        <div class="outlook__reader-body">${email.bodyHtml}</div>
      `;
    }

    // ── Master render ─────────────────────────────────────────────────────
    function render(): void {
      renderFolders();
      renderList();
      renderReader();
    }

    // ── Open compose ──────────────────────────────────────────────────────
    function openCompose(prefillTo?: string, prefillEmail?: string): void {
      void launch({
        appId: 'outlook-compose',
        args: {
          ...(prefillTo ? { prefillTo } : {}),
          ...(prefillEmail ? { prefillEmail } : {}),
        },
      });
    }

    // ── Init ──────────────────────────────────────────────────────────────
    renderContacts();
    render();

    return {
      onFocus() {
        root.classList.remove('outlook--blurred');
      },
      onBlur() {
        root.classList.add('outlook--blurred');
      },
    };
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default mod;
