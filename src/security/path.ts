// src/security/path.ts
import * as path from 'path';
import * as fs from 'fs';

function realpathSafe(p: string): string {
  try { return fs.realpathSync(p); } catch { return p; }
}

function resolveExistingAncestor(p: string): string {
  // Resolve symlinks for the nearest existing ancestor, then re-append missing tail.
  const resolved = path.resolve(p);
  if (fs.existsSync(resolved)) return fs.realpathSync(resolved);
  const parent = path.dirname(resolved);
  if (parent === resolved) return resolved; // filesystem root
  const realParent = resolveExistingAncestor(parent);
  return path.join(realParent, path.basename(resolved));
}

export function confinePath(root: string, target: string): string {
  if (!root) throw new Error('root required');
  if (typeof target !== 'string') throw new Error('target required');
  if (target.includes('\u0000') || root.includes('\u0000')) throw new Error('null byte in path');
  const resolvedRoot = resolveExistingAncestor(path.resolve(root));
  // resolvedRoot should exist; if not, resolve as-is
  const rootReal = fs.existsSync(resolvedRoot) ? fs.realpathSync(resolvedRoot) : path.resolve(resolvedRoot);
  const resolvedTarget = resolveExistingAncestor(path.resolve(root, target));
  if (resolvedTarget !== rootReal && !resolvedTarget.startsWith(rootReal + path.sep)) {
    throw new Error('path escapes workspace root');
  }
  return resolvedTarget;
}

export function isTraversal(p: string): boolean {
  if (!p) return false;
  const decoded = safeDecode(p);
  return decoded.includes('..') || decoded.includes('\u0000') || path.isAbsolute(decoded);
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}