import { beforeAll, describe, expect, it } from 'vitest';
import en from './en';

beforeAll(() => {
  // Node's vitest env exposes a partial localStorage; stub a working one.
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
});

import fr from './fr';
import { t, type I18nKey } from './index';

describe('i18n t()', () => {
  it('returns the English translation by default', () => {
    expect(t('explorer.go')).toBe(en['explorer.go']);
  });

  it('interpolates {0} placeholders', () => {
    expect(t('explorer.items.one', 1)).toBe('1 item');
    expect(t('explorer.items.other', 7)).toBe('7 items');
  });

  it('falls back to the key itself when missing everywhere', () => {
    const missing = 'does.not.exist' as I18nKey;
    expect(t(missing)).toBe('does.not.exist');
  });
});

describe('i18n key parity', () => {
  it('en and fr share exactly the same keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });
});
