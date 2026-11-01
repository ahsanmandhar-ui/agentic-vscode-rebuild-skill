// src/ui/design-tokens.ts
export const designTokens = {
  colors: {
    primary: '#4f46e5', primaryHover: '#4338ca',
    bg: '#0f172a', surface: '#1e293b', surfaceAlt: '#334155',
    text: '#f1f5f9', textMuted: '#94a3b8',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
    border: '#334155',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  font: { body: '14px', heading: '18px', small: '12px' },
  shadow: { sm: '0 1px 2px rgba(0,0,0,.3)', md: '0 4px 8px rgba(0,0,0,.4)', lg: '0 8px 24px rgba(0,0,0,.5)' },
};

export function cssVariables(): string {
  const c = designTokens.colors;
  const s = designTokens.spacing;
  const r = designTokens.radius;
  return `:root {
  --vc-primary: ${c.primary}; --vc-primary-hover: ${c.primaryHover};
  --vc-bg: ${c.bg}; --vc-surface: ${c.surface}; --vc-surface-alt: ${c.surfaceAlt};
  --vc-text: ${c.text}; --vc-text-muted: ${c.textMuted};
  --vc-success: ${c.success}; --vc-warning: ${c.warning}; --vc-danger: ${c.danger};
  --vc-border: ${c.border};
  --vc-space-xs: ${s.xs}px; --vc-space-sm: ${s.sm}px; --vc-space-md: ${s.md}px; --vc-space-lg: ${s.lg}px; --vc-space-xl: ${s.xl}px;
  --vc-radius-sm: ${r.sm}px; --vc-radius-md: ${r.md}px; --vc-radius-lg: ${r.lg}px; --vc-radius-xl: ${r.xl}px;
  --vc-font-body: ${designTokens.font.body}; --vc-font-heading: ${designTokens.font.heading};
  --vc-shadow-sm: ${designTokens.shadow.sm}; --vc-shadow-md: ${designTokens.shadow.md}; --vc-shadow-lg: ${designTokens.shadow.lg};
}`;
}
