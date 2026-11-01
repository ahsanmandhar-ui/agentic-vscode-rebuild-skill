// src/ui/animations.ts
export const animations = {
  fadeIn: 'vc-fade-in 200ms ease-out',
  slideUp: 'vc-slide-up 240ms cubic-bezier(.2,.8,.2,1)',
  pulse: 'vc-pulse 1.2s ease-in-out infinite',
  spin: 'vc-spin 800ms linear infinite',
  shake: 'vc-shake 400ms ease-in-out',
};

export function animationCss(): string {
  return `
@keyframes vc-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes vc-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes vc-pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes vc-spin { to { transform: rotate(360deg); } }
@keyframes vc-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.vc-fade-in { animation: vc-fade-in 200ms ease-out; }
.vc-slide-up { animation: vc-slide-up 240ms cubic-bezier(.2,.8,.2,1); }
.vc-pulse { animation: vc-pulse 1.2s ease-in-out infinite; }
.vc-spin { animation: vc-spin 800ms linear infinite; }
.vc-shake { animation: vc-shake 400ms ease-in-out; }
.vc-transition { transition: all 150ms ease; }
`;
}
