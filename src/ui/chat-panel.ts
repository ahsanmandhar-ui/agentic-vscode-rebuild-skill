// src/ui/chat-panel.ts
// Pure HTML renderer for the "Chat" panel (U2/U3): conversation timeline, composer,
// streaming aria-live region, one-click invoke. CSS classes only (no inline styles);
// accessible, keyboard-navigable; respects reduced motion via media query.

export interface ChatMessage {
  id?: string;
  role?: 'user' | 'assistant' | 'tool' | 'system' | string;
  content?: unknown;
  text?: unknown;
  message?: unknown;
  streaming?: boolean;
  [key: string]: unknown;
}

export interface RenderChatPanelArgs {
  messages?: ChatMessage[] | null;
  conversation?: ChatMessage[] | null;
  timeline?: ChatMessage[] | null;
  streaming?: boolean | string;
  isStreaming?: boolean;
  invokeLabel?: string;
  invokeId?: string;
  emptyMessage?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function msgText(m: ChatMessage): string {
  const v = m?.content ?? m?.text ?? m?.message ?? '';
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('');
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return String(v ?? '');
}

function msgRole(m: ChatMessage): string {
  return String(m?.role ?? 'assistant').toLowerCase();
}

function bubbleClass(role: string): string {
  if (role === 'user') return 'vc-chat-bubble vc-chat-bubble--user is-user';
  if (role === 'tool') return 'vc-chat-bubble vc-chat-bubble--tool is-tool';
  if (role === 'system') return 'vc-chat-bubble vc-chat-bubble--system is-system';
  return 'vc-chat-bubble vc-chat-bubble--assistant is-assistant';
}

function renderMessage(m: ChatMessage, i: number): string {
  const role = msgRole(m);
  const id = String(m?.id ?? `msg-${i}`);
  const text = msgText(m);
  const streaming = m?.streaming === true;
  if (role === 'tool') {
    return [
      `<article class="vc-chat-tool-card chat-tool-card" data-message-id="${esc(id)}" aria-label="Tool message">`,
      `  <div class="vc-chat-tool-card__body">${esc(text)}</div>`,
      `</article>`,
    ].join('\n');
  }
  return [
    `<article class="vc-chat-message chat-message ${bubbleClass(role)}" data-message-id="${esc(id)}" data-role="${esc(role)}" aria-label="${esc(role)} message">`,
    `  <div class="vc-chat-bubble__content">${esc(text)}</div>`,
    streaming ? `  <span class="vc-chat-streaming-indicator" aria-live="polite">…</span>` : '',
    `</article>`,
  ].filter(Boolean).join('\n');
}

export function renderChatPanel(args: RenderChatPanelArgs = {}): string {
  const messages = Array.isArray(args?.messages)
    ? args.messages
    : Array.isArray(args?.conversation)
      ? args.conversation
      : Array.isArray(args?.timeline)
        ? args.timeline
        : [];
  const list = messages.filter((m) => m != null) as ChatMessage[];

  const isStreaming =
    args?.isStreaming === true ||
    args?.streaming === true ||
    args?.streaming === 'streaming' ||
    args?.streaming === 'true';

  const invokeLabel = String(args?.invokeLabel ?? 'Run');
  const invokeId = String(args?.invokeId ?? 'vibecode.chat.invoke');
  const emptyMessage = String(args?.emptyMessage ?? 'Tell me what to do in this workspace…');

  const timeline =
    list.length === 0
      ? `<p class="vc-chat-empty-msg chat-empty-msg">${esc(emptyMessage)}</p>`
      : list.map(renderMessage).join('\n');

  const chips = ['skill', 'attach'].map((c) => `<button type="button" class="vc-chat-chip chat-skill-chip" data-chip="${esc(c)}" aria-label="${esc(c)} chip">${esc(c)}</button>`).join('');

  return [
    `<section class="vc-chat-panel chat-panel" aria-label="Chat panel">`,
    `  <div class="vc-chat-timeline chat-timeline conversation-timeline" role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text">`,
    `    ${timeline}`,
    `  </div>`,
    `  <div class="vc-chat-streaming streaming" aria-live="polite" aria-atomic="true" role="status">${isStreaming ? 'Streaming…' : ''}</div>`,
    `  <form class="vc-chat-composer chat-composer composer" aria-label="Chat composer">`,
    `    <div class="vc-chat-composer__field">`,
    `      <label class="vc-chat-composer__label" for="vc-chat-input">Message</label>`,
    `      <textarea id="vc-chat-input" name="message" class="vc-chat-input chat-input" rows="3" aria-label="Chat message" placeholder="Type a message…"></textarea>`,
    `    </div>`,
    `    <div class="vc-chat-composer__actions chat-composer-actions">`,
    `      <button type="button" class="vc-btn vc-chat-attach chat-attach" data-action="chat-attach" aria-label="Attach file">Attach</button>`,
    `      <button type="submit" class="vc-btn vc-chat-send chat-send" data-action="chat-send" aria-label="Send message">Send</button>`,
    `    </div>`,
    `    <div class="vc-chat-skill-chips chat-skill-chips" role="group" aria-label="Skill chips">${chips}</div>`,
    `  </form>`,
    `  <div class="vc-chat-invoke-row">`,
    `    <button type="button" class="vc-btn vc-chat-invoke one-click-invoke invoke" data-action="${esc(invokeId)}" aria-label="${esc(invokeLabel)}">${esc(invokeLabel)}</button>`,
    `  </div>`,
    `</section>`,
  ].join('\n');
}

export default renderChatPanel;
