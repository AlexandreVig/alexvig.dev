import type { AppModule } from '../types';
import './compose.css';

const mod: AppModule = {
  mount({ root, host, args, signal }) {
    const prefillTo = (args.prefillTo as string) ?? '';
    const prefillEmail = (args.prefillEmail as string) ?? '';

    root.classList.add('compose');
    root.innerHTML = `
      <div class="compose__toolbar">
        <button class="compose__btn compose__btn--send" data-action="send">
          <img src="/icons/outlook/send-recv.png" alt="" />
          <span>Send</span>
        </button>
        <div class="compose__tsep"></div>
        <button class="compose__btn" disabled>
          <img src="/icons/outlook/delete.png" alt="" />
          <span>Cut</span>
        </button>
        <button class="compose__btn" disabled>
          <img src="/icons/outlook/find.png" alt="" />
          <span>Paste</span>
        </button>
        <div class="compose__tsep"></div>
        <button class="compose__btn" disabled>
          <img src="/icons/outlook/print.png" alt="" />
          <span>Check</span>
        </button>
      </div>

      <div class="compose__fields">
        <div class="compose__field-row">
          <label class="compose__field-label">To:</label>
          <input class="compose__field-input" name="to" type="text" value="alexandre.vigneau@epitech.eu" readonly tabindex="-1" />
        </div>
        <div class="compose__field-row">
          <label class="compose__field-label">From:</label>
          <input class="compose__field-input" name="from" type="text" placeholder="Your Name" value="${escapeAttr(prefillTo)}" />
        </div>
        <div class="compose__field-row">
          <label class="compose__field-label">Email:</label>
          <input class="compose__field-input" name="email" type="email" placeholder="your@email.com" value="${escapeAttr(prefillEmail)}" />
        </div>
        <div class="compose__field-row">
          <label class="compose__field-label">Subject:</label>
          <input class="compose__field-input" name="subject" type="text" placeholder="Subject" />
        </div>
      </div>

      <div class="compose__honeypot" aria-hidden="true">
        <input name="website" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <textarea class="compose__body" name="message" placeholder="Type your message here..."></textarea>

      <div class="compose__status">
        <span class="compose__status-text"></span>
      </div>
    `;

    const toInput = root.querySelector<HTMLInputElement>('input[name="to"]')!;
    const fromInput = root.querySelector<HTMLInputElement>('input[name="from"]')!;
    const emailInput = root.querySelector<HTMLInputElement>('input[name="email"]')!;
    const subjectInput = root.querySelector<HTMLInputElement>('input[name="subject"]')!;
    const honeypot = root.querySelector<HTMLInputElement>('input[name="website"]')!;
    const messageArea = root.querySelector<HTMLTextAreaElement>('textarea[name="message"]')!;
    const statusText = root.querySelector<HTMLElement>('.compose__status-text')!;

    let sending = false;

    function setStatus(text: string, isError = false): void {
      statusText.textContent = text;
      statusText.style.color = isError ? '#c00' : '#333';
    }

    function validate(): string | null {
      if (!fromInput.value.trim()) return 'Please enter your name.';
      if (!emailInput.value.trim()) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim()))
        return 'Please enter a valid email address.';
      if (!subjectInput.value.trim()) return 'Please enter a subject.';
      if (!messageArea.value.trim()) return 'Please enter a message.';
      if (fromInput.value.length > 80) return 'Name is too long (max 80 characters).';
      if (subjectInput.value.length > 120) return 'Subject is too long (max 120 characters).';
      if (messageArea.value.length > 4000) return 'Message is too long (max 4000 characters).';
      return null;
    }

    async function send(): Promise<void> {
      if (sending) return;

      const error = validate();
      if (error) {
        setStatus(error, true);
        return;
      }

      // Honeypot check (client-side — server also validates)
      if (honeypot.value) {
        setStatus('Your message has been sent!');
        return;
      }

      sending = true;
      setStatus('Sending message...');
      setFieldsDisabled(true);

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fromInput.value.trim(),
            email: emailInput.value.trim(),
            subject: subjectInput.value.trim(),
            message: messageArea.value.trim(),
            website: honeypot.value,
          }),
        });

        const data = await res.json();

        if (res.ok && data.ok) {
          setStatus('Your message has been sent!');
          setTimeout(() => host.close(), 1200);
        } else {
          setStatus(data.error ?? 'Failed to send message. Please try again.', true);
          setFieldsDisabled(false);
          sending = false;
        }
      } catch {
        setStatus('Network error. Please try again.', true);
        setFieldsDisabled(false);
        sending = false;
      }
    }

    function setFieldsDisabled(disabled: boolean): void {
      fromInput.disabled = disabled;
      emailInput.disabled = disabled;
      subjectInput.disabled = disabled;
      messageArea.disabled = disabled;
      const sendBtn = root.querySelector<HTMLButtonElement>('[data-action="send"]')!;
      sendBtn.disabled = disabled;
    }

    // ── Event listeners ───────────────────────────────────────────────────
    root.addEventListener(
      'click',
      (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'send') void send();
      },
      { signal },
    );

    // Set title
    host.setTitle('New Message');
    host.setIcon('/icons/outlook/create-mail.png');
  },
};

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default mod;
