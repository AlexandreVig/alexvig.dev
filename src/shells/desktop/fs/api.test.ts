import { describe, expect, it } from 'vitest';
import { joinPath, listChildren, parentPath, resolve } from './api';

describe('parentPath', () => {
  it('returns parent of a nested path', () => {
    expect(parentPath('/Desktop/A.md')).toBe('/Desktop');
  });

  it('returns / for top-level entries', () => {
    expect(parentPath('/Desktop')).toBe('/');
  });

  it('returns / for root', () => {
    expect(parentPath('/')).toBe('/');
  });
});

describe('joinPath', () => {
  it('joins a child name onto a parent path', () => {
    expect(joinPath('/Desktop', 'A.md')).toBe('/Desktop/A.md');
  });

  it('joins onto root', () => {
    expect(joinPath('/', 'Desktop')).toBe('/Desktop');
  });

  it('normalizes parent with trailing segments', () => {
    expect(joinPath('/a/b', 'c')).toBe('/a/b/c');
  });
});

describe('resolve', () => {
  it('returns the root folder for "/"', () => {
    const node = resolve('/');
    expect(node).not.toBeNull();
    expect(node?.kind).toBe('folder');
  });

  it('returns null for a path that does not exist', () => {
    expect(resolve('/does/not/exist')).toBeNull();
  });
});

describe('listChildren', () => {
  it('returns an array for the root folder', () => {
    expect(Array.isArray(listChildren('/'))).toBe(true);
  });

  it('returns [] for non-existent paths', () => {
    expect(listChildren('/nope')).toEqual([]);
  });
});
