// src/ui/project-chat.ts
import { escapeHtml } from '../supervisor';

export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }

export function renderProjectChat(messages: ChatMessage[] = [], projectPath?: string): string {
  const msgs = messages.map(m =>
    `<div class="vc-chat-msg vc-chat-${m.role}"><span class="role">${m.role}</span><div class="content">${escapeHtml(m.content)}</div></div>`
  ).join('');
  return [
    '<div class="vc-project-chat">',
    `  <header><h2>Project Chat</h2><span class="path">${escapeHtml(projectPath ?? '')}</span></header>`,
    '  <div class="vc-chat-log" role="log" aria-live="polite">' + msgs + '</div>',
    '  <form class="vc-chat-input"><input type="text" placeholder="Ask about this project..." aria-label="chat input" /><button type="submit">Send</button></form>',
    '</div>',
  ].join('\n');
}
