import { describe, it, expect } from 'vitest';
import { InMemorySecretStorage, adaptSecretStorage, AccountManager } from '../providers/accounts';

describe('SecretStorage round-trip', () => {
  it('stores and retrieves a value', async () => {
    const storage = new InMemorySecretStorage();
    await storage.set('key', 'secret-value');
    expect(await storage.get('key')).toBe('secret-value');
  });

  it('deletes a value', async () => {
    const storage = new InMemorySecretStorage();
    await storage.set('key', 'v');
    await storage.delete('key');
    expect(await storage.get('key')).toBeUndefined();
  });

  it('adapts vscode-style storage (store/get/delete)', async () => {
    const m = new Map<string, string>();
    const raw: any = {
      _m: m,
      get: (k: string) => Promise.resolve(m.get(k)),
      store: (k: string, v: string) => { m.set(k, v); return Promise.resolve(); },
      delete: (k: string) => { m.delete(k); return Promise.resolve(); },
    };
    const storage = adaptSecretStorage(raw);
    await storage.set('k', 'v');
    expect(await storage.get('k')).toBe('v');
    await storage.delete('k');
    expect(await storage.get('k')).toBeUndefined();
  });

  it('round-trips through AccountManager', async () => {
    const storage = new InMemorySecretStorage();
    const mgr = new AccountManager(storage);
    const acct = await mgr.addAccount({ providerId: 'p', secret: 'sk-roundtrip', label: 'L' } as any);
    const list = await mgr.listAccounts('p');
    expect(list.length).toBe(1);
    const sec = await mgr.getSecret(list[0]);
    expect(sec).toBe('sk-roundtrip');
    await mgr.removeAccount(acct.id, 'p');
    expect((await mgr.listAccounts('p')).length).toBe(0);
  });
});

