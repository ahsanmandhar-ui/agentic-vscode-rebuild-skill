import { describe, it, expect } from 'vitest';
import { searchBrave, createBraveAdapter } from '../search/brave';
import { searchSerpApi, createSerpApiAdapter } from '../search/serpapi';

const braveKey = process.env.BRAVE_API_KEY || process.env.BRAVE_KEY;
const serpKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;

describe('provider smoke: Brave', () => {
  it('throws key required without key', async () => {
    await expect(searchBrave('test', {})).rejects.toThrow(/key is required/i);
  });

  it.skipIf(!braveKey)('live Brave search returns results', async () => {
    const r = await searchBrave('javascript', { apiKey: braveKey, maxResults: 3 });
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
});

describe('provider smoke: SerpAPI', () => {
  it('throws key required without key', async () => {
    await expect(searchSerpApi('test', {})).rejects.toThrow(/key is required/i);
  });

  it.skipIf(!serpKey)('live SerpAPI search returns results', async () => {
    const r = await searchSerpApi('javascript', { apiKey: serpKey, maxResults: 3 });
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
});
