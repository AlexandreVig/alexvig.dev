import type { Folder, Email, Contact } from './types';

export const folders: Folder[] = [
  { id: 'inbox', name: 'Inbox', icon: '/icons/outlook/folder-inbox.png', unread: 1 },
  { id: 'outbox', name: 'Outbox', icon: '/icons/outlook/folder-outbox.png' },
  { id: 'sent', name: 'Sent Items', icon: '/icons/outlook/folder-sent.png' },
  { id: 'deleted', name: 'Deleted Items', icon: '/icons/outlook/folder-deleted.png' },
  { id: 'drafts', name: 'Drafts', icon: '/icons/outlook/folder-drafts.png' },
];

export const emails: Email[] = [
  // ── Inbox ──────────────────────────────────────────────────────────────────
  {
    id: 'alexandre-note',
    folder: 'inbox',
    from: { name: 'Alexandre Vigneau', email: 'alexandre.vigneau@epitech.eu' },
    to: 'You',
    subject: 'A note from the developer',
    date: '2026-04-09T12:00:00Z',
    unread: false,
    bodyHtml: `
      <div style="font-family: Tahoma, sans-serif; font-size: 11px; padding: 12px;">
        <p>Hey! 👋</p>
        <p>Thanks for exploring my portfolio. This Outlook Express clone is
           actually a working contact form, click <b>Create Mail</b> in the
           toolbar above to send me a real message.</p>
        <p>Here's where you can find me:</p>
        <ul>
          <li><b>Email:</b> <a href="mailto:alexandre.vigneau@epitech.eu">alexandre.vigneau@epitech.eu</a></li>
          <li><b>GitHub:</b> <a href="https://github.com/AlexandreVig" target="_blank">github.com/AlexandreVig</a></li>
          <li><b>LinkedIn:</b> <a href="https://linkedin.com/in/alexandrevigneau" target="_blank">linkedin.com/in/alexandrevigneau</a></li>
        </ul>
        <p>— Alexandre</p>
      </div>
    `,
  },
  {
    id: 'bill-gates',
    folder: 'inbox',
    from: { name: 'Bill Gates', email: 'bill@microsoft.com' },
    to: 'Alexandre Vigneau',
    subject: 'RE: Your portfolio',
    date: '2026-04-09T09:30:00Z',
    unread: false,
    bodyHtml: `
      <div style="font-family: Tahoma, sans-serif; font-size: 11px; padding: 12px;">
        <p>Alexandre,</p>
        <p>I must say, this Windows XP recreation is absolutely remarkable.
           The attention to detail — the title bar gradients, the cascade
           positioning, even the toolbar button hover states — it takes me
           right back to 2001.</p>
        <p>If I were still hiring developers at Microsoft, you'd be at the
           top of my list. Keep building great things.</p>
        <p style="margin-top: 16px;">Best regards,<br /><b>Bill</b></p>
        <p style="color: #888; font-size: 10px; margin-top: 12px;">
          Sent from my Surface Pro running Windows XP (yes, really)
        </p>
      </div>
    `,
  },
  {
    id: 'nigerian-prince',
    folder: 'inbox',
    from: { name: 'Prince Abubakar III', email: 'prince@totallylegit.ng' },
    to: 'Dear Friend',
    subject: 'URGENT: You have been selected!!!',
    date: '2026-04-08T22:15:00Z',
    unread: true,
    bodyHtml: `
      <div style="font-family: Tahoma, sans-serif; font-size: 11px; padding: 12px;">
        <p>DEAR FRIEND,</p>
        <p>I am Prince Abubakar III, the sole heir to the Kingdom of Nigeria Web
           Development. I have $15,000,000 (FIFTEEN MILLION UNITED STATES DOLLARS)
           in GitHub Stars that I need to transfer to a trustworthy developer.</p>
        <p>All I require is:</p>
        <ul>
          <li>Your full stack expertise</li>
          <li>One (1) npm install</li>
          <li>Your GitHub username for immediate star transfer</li>
        </ul>
        <p>Please respond URGENTLY as this offer expires when node_modules
           finishes installing.</p>
        <p>Yours in pending promises,<br /><b>Prince Abubakar III</b><br />
           <em>BSc. Computer Science (University of Lagos)<br />
           MSc. Advanced 419 Engineering</em></p>
      </div>
    `,
  },

  // ── Sent Items ─────────────────────────────────────────────────────────────
  {
    id: 'sent-reply',
    folder: 'sent',
    from: { name: 'Alexandre Vigneau', email: 'alexandre.vigneau@epitech.eu' },
    to: 'Bill Gates <bill@microsoft.com>',
    subject: 'RE: Your portfolio',
    date: '2026-04-09T10:15:00Z',
    unread: false,
    bodyHtml: `
      <div style="font-family: Tahoma, sans-serif; font-size: 11px; padding: 12px;">
        <p>Bill,</p>
        <p>Thank you so much! Coming from you, that means the world.
           I spent way too many hours getting those gradients pixel-perfect.</p>
        <p>If you ever want to collaborate on a Windows ME recreation,
           you know where to find me. 😄</p>
        <p>Best,<br /><b>Alexandre</b></p>
      </div>
    `,
  },

  // ── Deleted Items ──────────────────────────────────────────────────────────
  {
    id: 'deleted-important',
    folder: 'deleted',
    from: { name: 'System Administrator', email: 'admin@localhost' },
    to: 'Alexandre Vigneau',
    subject: 'RE: Important — DO NOT DELETE',
    date: '2026-04-06T08:00:00Z',
    unread: false,
    bodyHtml: `
      <div style="font-family: Tahoma, sans-serif; font-size: 11px; padding: 12px;">
        <p style="color: red; font-weight: bold;">⚠️ RECOVERED FROM RECYCLE BIN ⚠️</p>
        <p>This email was marked as important and should not have been deleted.</p>
        <p>Contents of the original message:</p>
        <div style="background: #f5f5f5; padding: 12px; border-left: 3px solid #ccc; margin: 8px 0;">
          <p><code>sudo rm -rf /node_modules</code></p>
          <p>Just kidding. Never do that.</p>
          <p>Actually, do it every day. It builds character.</p>
        </div>
      </div>
    `,
  },

  // ── Drafts ─────────────────────────────────────────────────────────────────
  {
    id: 'draft-todo',
    folder: 'drafts',
    from: { name: 'Alexandre Vigneau', email: 'alexandre.vigneau@epitech.eu' },
    to: '',
    subject: 'TODO: finish this email',
    date: '2026-04-05T16:30:00Z',
    unread: false,
    bodyHtml: `
      <div style="font-family: Tahoma, sans-serif; font-size: 11px; padding: 12px;">
        <p>Dear [RECIPIENT],</p>
        <p>I wanted to reach out regarding</p>
        <p style="color: #999;"><em>[ ...this is where I got distracted by
           a CSS bug and never came back... ]</em></p>
        <p style="color: #999;"><em>TODO:</em></p>
        <ul style="color: #999;">
          <li><em>Finish this email</em></li>
          <li><em>Fix the CSS bug</em></li>
          <li><em>Touch grass</em></li>
          <li><em>Remember what this email was about</em></li>
        </ul>
      </div>
    `,
  },
];

export const contacts: Contact[] = [
  { name: 'Clippy', email: 'clippy@microsoft.com', icon: '/icons/outlook/contact.png' },
  { name: 'Bill Gates', email: 'bill@microsoft.com', icon: '/icons/outlook/contact.png' },
  { name: 'Alexandre', email: 'alexandre.vigneau@epitech.eu', icon: '/icons/outlook/contact.png' },
];
