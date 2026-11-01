// src/tools/browser.ts
// Browser automation (navigate, screenshot, extract DOM) behind PermissionEngine +
// SSRF guard + sandboxed file output. Puppeteer is optional; falls back to fetch
// when it is not installed. Clean-room, no vendoring.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PermissionEngine, PermissionRequest } from '../security/permissionEngine';
import { confinePath } from '../security/path';
import { isPrivateOrReservedHost } from '../providers/transport';

export class BrowserError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'BrowserError';
  }
}

export interface BrowserToolOptions {
  permissionEngine: PermissionEngine;
  fetch?: (input: any, init?: any) => Promise<any>;
  sandboxDir?: string;
  approver?: (req: PermissionRequest) => Promise<boolean>;
  allowPrivateHosts?: boolean;
  puppeteerModule?: any;
  timeoutMs?: number;
}

export interface BrowserNavigateOptions {
  timeoutMs?: number;
  waitUntil?: string;
  extractHtml?: boolean;
}

export interface BrowserNavigateResult {
  url: string;
  title?: string;
  status?: number;
  html?: string;
  fallback?: string;
}

export interface BrowserScreenshotOptions {
  url?: string;
  path?: string;
  fullPage?: boolean;
  type?: 'png' | 'jpeg' | 'webp';
  base64?: boolean;
  timeoutMs?: number;
}

export interface BrowserScreenshotResult {
  url: string;
  path?: string;
  base64?: string;
  mimeType?: string;
  fallback?: string;
  content?: string;
}

export interface BrowserExtractOptions {
  url?: string;
  selector?: string;
  timeoutMs?: number;
}

export interface BrowserExtractResult {
  url: string;
  selector?: string;
  html?: string;
  text?: string;
  fallback?: string;
}

function normalizeUrlInput(input: any): { url?: string; rest: Record<string, any> } {
  if (typeof input === 'string') return { url: input, rest: {} };
  if (input && typeof input === 'object') {
    const o = input as Record<string, any>;
    const url = o.url ?? o.target ?? o.href;
    return { url: typeof url === 'string' ? url : undefined, rest: o };
  }
  return { url: undefined, rest: {} };
}

export class BrowserTool {
  private readonly permission: PermissionEngine;
  private readonly fetchFn: (input: any, init?: any) => Promise<any>;
  private readonly sandboxDir: string;
  private readonly approver?: (req: PermissionRequest) => Promise<boolean>;
  private readonly allowPrivateHosts: boolean;
  private puppeteer: any;
  private readonly timeoutMs: number;

  constructor(options: BrowserToolOptions) {
    if (!options || !options.permissionEngine) throw new BrowserError('permissionEngine required');
    this.permission = options.permissionEngine;
    this.fetchFn = options.fetch ?? ((i, init) => globalThis.fetch(i, init));
    this.sandboxDir = options.sandboxDir || path.join(os.tmpdir(), 'vibecode-browser');
    this.approver = options.approver;
    this.allowPrivateHosts = !!options.allowPrivateHosts;
    this.puppeteer = options.puppeteerModule ?? null;
    this.timeoutMs = Number(options.timeoutMs) || 30000;
    try { fs.mkdirSync(this.sandboxDir, { recursive: true }); } catch { /* noop */ }
  }

  private async gate(action: PermissionRequest['action'], target: string, reason: string): Promise<void> {
    const req: PermissionRequest = { action, target, reason, scope: 'once' };
    const verdict = this.permission.decide(req, () => false);
    if (verdict.decision === 'allow') return;
    if (verdict.decision === 'deny') throw new BrowserError(`permission denied: ${action} ${target} (${verdict.reason})`, 'PERMISSION_DENIED');
    if (this.approver) {
      const ok = await this.approver(req);
      if (ok) {
        this.permission.remember({ action, targetPattern: target, decision: 'allow', scope: 'once' });
        return;
      }
      throw new BrowserError(`permission denied by user: ${action} ${target}`, 'PERMISSION_DENIED');
    }
    throw new BrowserError(`permission required (ask): ${action} ${target}`, 'PERMISSION_REQUIRED');
  }

  private assertSafeUrl(url: string): void {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new BrowserError('invalid url', 'INVALID_URL'); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new BrowserError('unsupported protocol', 'INVALID_PROTOCOL');
    if (!this.allowPrivateHosts && isPrivateOrReservedHost(parsed.hostname)) {
      throw new BrowserError(`refusing private/reserved host: ${parsed.hostname}`, 'SSRF_BLOCKED');
    }
  }

  private loadPuppeteer(): any {
    if (this.puppeteer) return this.puppeteer;
    try { this.puppeteer = require('puppeteer'); } catch { this.puppeteer = null; }
    if (!this.puppeteer) {
      try { this.puppeteer = require('puppeteer-core'); } catch { this.puppeteer = null; }
    }
    return this.puppeteer;
  }

  private confineOutput(p: string): string {
    const target = p && path.isAbsolute(p) ? p : path.join(this.sandboxDir, p || 'screenshot.png');
    return confinePath(this.sandboxDir, path.relative(this.sandboxDir, target) || path.basename(target));
  }


  async navigate(urlInput: any, opts: BrowserNavigateOptions = {}): Promise<BrowserNavigateResult> {
    const { url, rest } = normalizeUrlInput(urlInput);
    const targetUrl = url ?? rest.url;
    if (!targetUrl || typeof targetUrl !== 'string') throw new BrowserError('url required', 'INVALID_URL');
    this.assertSafeUrl(targetUrl);
    await this.gate('network', targetUrl, 'browser navigate');

    const timeoutMs = Number(opts.timeoutMs ?? rest.timeoutMs ?? this.timeoutMs) || this.timeoutMs;
    const puppeteer = this.loadPuppeteer();

    if (puppeteer && typeof (puppeteer as any).launch === 'function') {
      let browser: any;
      try {
        browser = await (puppeteer as any).launch({ headless: true });
        const page = await browser.newPage();
        const res = await page.goto(targetUrl, { waitUntil: opts.waitUntil ?? rest.waitUntil ?? 'domcontentloaded', timeout: timeoutMs });
        const title = await page.title().catch(() => undefined);
        const html = (opts.extractHtml || rest.extractHtml) ? await page.content() : undefined;
        await page.close();
        return { url: page.url(), title, status: res?.status?.(), html };
      } catch (e: any) {
        throw new BrowserError(`navigation failed: ${e?.message ?? String(e)}`, 'NAVIGATION_FAILED');
      } finally {
        try { if (browser) await browser.close(); } catch { /* noop */ }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await this.fetchFn(targetUrl, { method: 'GET', signal: controller.signal, redirect: 'manual' });
      if (res && res.status >= 300 && res.status < 400) throw new BrowserError('redirects are not allowed (SSRF guard)', 'SSRF_BLOCKED');
      const text = typeof res?.text === 'function' ? await res.text() : String(res ?? '');
      const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      return {
        url: targetUrl,
        title: titleMatch ? titleMatch[1].trim() : undefined,
        status: typeof res?.status === 'number' ? res.status : 200,
        html: (opts.extractHtml || rest.extractHtml) ? text : undefined,
        fallback: 'fetch',
      };
    } catch (e: any) {
      if (e instanceof BrowserError) throw e;
      throw new BrowserError(`navigation failed: ${e?.message ?? String(e)}`, 'NAVIGATION_FAILED');
    } finally {
      clearTimeout(timer);
    }
  }


  async screenshot(input?: any, opts: BrowserScreenshotOptions = {}): Promise<BrowserScreenshotResult> {
    const { url, rest } = normalizeUrlInput(input);
    const merged: BrowserScreenshotOptions = { ...rest, ...opts };
    const targetUrl = merged.url ?? url;
    if (!targetUrl || typeof targetUrl !== 'string') throw new BrowserError('url required', 'INVALID_URL');
    this.assertSafeUrl(targetUrl);
    await this.gate('network', targetUrl, 'browser screenshot');

    const outputPath = merged.path ? this.confineOutput(String(merged.path)) : undefined;
    if (outputPath) await this.gate('write', outputPath, 'browser screenshot output');

    const timeoutMs = Number(merged.timeoutMs ?? this.timeoutMs) || this.timeoutMs;
    const puppeteer = this.loadPuppeteer();

    if (puppeteer && typeof (puppeteer as any).launch === 'function') {
      let browser: any;
      try {
        browser = await (puppeteer as any).launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        const type = merged.type || 'png';
        const mime = type === 'jpeg' ? 'image/jpeg' : type === 'webp' ? 'image/webp' : 'image/png';
        if (merged.base64) {
          const buf = await page.screenshot({ fullPage: !!merged.fullPage, type, encoding: 'base64' });
          await page.close();
          return { url: targetUrl, base64: String(buf), mimeType: mime };
        }
        if (outputPath) {
          await page.screenshot({ path: outputPath, fullPage: !!merged.fullPage, type });
          await page.close();
          return { url: targetUrl, path: outputPath, mimeType: mime };
        }
        const buf = await page.screenshot({ fullPage: !!merged.fullPage, type, encoding: 'base64' });
        await page.close();
        return { url: targetUrl, base64: String(buf), mimeType: mime };
      } catch (e: any) {
        throw new BrowserError(`screenshot failed: ${e?.message ?? String(e)}`, 'SCREENSHOT_FAILED');
      } finally {
        try { if (browser) await browser.close(); } catch { /* noop */ }
      }
    }

    const nav = await this.navigate(targetUrl, { extractHtml: true });
    const html = nav.html ?? '';
    const fallbackPath = outputPath || path.join(this.sandboxDir, 'screenshot.html');
    if (outputPath || merged.path) {
      try { fs.writeFileSync(fallbackPath, html, 'utf8'); } catch { /* noop */ }
    }
    return {
      url: targetUrl,
      path: (outputPath || merged.path) ? fallbackPath : undefined,
      content: html,
      mimeType: 'text/html',
      fallback: 'fetch',
    };
  }

  async extractDom(input?: any, selector?: string, opts: BrowserExtractOptions = {}): Promise<BrowserExtractResult> {
    const { url, rest } = normalizeUrlInput(input);
    const merged: any = { ...rest, ...opts };
    const targetUrl = merged.url ?? url;
    if (!targetUrl || typeof targetUrl !== 'string') throw new BrowserError('url required', 'INVALID_URL');
    const sel = selector ?? merged.selector;
    this.assertSafeUrl(targetUrl);
    await this.gate('network', targetUrl, 'browser extract DOM');
    if (sel) await this.gate('read', `${targetUrl}#${sel}`, 'browser extract DOM selector');

    const timeoutMs = Number(merged.timeoutMs ?? this.timeoutMs) || this.timeoutMs;
    const puppeteer = this.loadPuppeteer();

    if (puppeteer && typeof (puppeteer as any).launch === 'function') {
      let browser: any;
      try {
        browser = await (puppeteer as any).launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        const result = await page.evaluate((s: string | undefined) => {
          const pick = s ? document.querySelector(s) : document.documentElement;
          return {
            html: pick ? (pick as any).outerHTML : '',
            text: pick ? (pick as any).textContent || '' : '',
          };
        }, sel);
        await page.close();
        return { url: targetUrl, selector: sel, html: result?.html, text: result?.text };
      } catch (e: any) {
        throw new BrowserError(`extract failed: ${e?.message ?? String(e)}`, 'EXTRACT_FAILED');
      } finally {
        try { if (browser) await browser.close(); } catch { /* noop */ }
      }
    }

    const nav = await this.navigate(targetUrl, { extractHtml: true });
    const html = nav.html ?? '';
    return {
      url: targetUrl,
      selector: sel,
      html,
      text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      fallback: 'fetch',
    };
  }

  dispose(): void {
    this.puppeteer = null;
  }
}


export function createBrowser(options: BrowserToolOptions): BrowserTool {
  return new BrowserTool(options);
}

export { BrowserTool as BrowserAutomation, BrowserTool as BrowserClient, BrowserTool as BrowserManager };

export async function navigate(url: string, options: any = {}): Promise<BrowserNavigateResult> {
  const { permissionEngine, ...rest } = options || {};
  const tool = new BrowserTool({ permissionEngine, ...rest });
  try { return await tool.navigate(url, rest); } finally { tool.dispose(); }
}

export async function screenshot(urlOrOpts: any, options: any = {}): Promise<BrowserScreenshotResult> {
  const { permissionEngine, ...rest } = options || {};
  const tool = new BrowserTool({ permissionEngine, ...rest });
  try { return await tool.screenshot(urlOrOpts, rest); } finally { tool.dispose(); }
}

export async function extractDom(urlOrOpts: any, selector?: string, options: any = {}): Promise<BrowserExtractResult> {
  const { permissionEngine, ...rest } = options || {};
  const tool = new BrowserTool({ permissionEngine, ...rest });
  try { return await tool.extractDom(urlOrOpts, selector, rest); } finally { tool.dispose(); }
}

export default BrowserTool;

