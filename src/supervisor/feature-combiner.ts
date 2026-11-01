// src/supervisor/feature-combiner.ts
export interface FeatureSource { source: string; features: string[]; }

export function combineFeatures(sources: FeatureSource[]): { all: string[]; bySource: Record<string, string[]> } {
  const set = new Set<string>();
  const bySource: Record<string, string[]> = {};
  for (const s of sources) {
    bySource[s.source] = s.features;
    for (const f of s.features) set.add(f);
  }
  return { all: [...set].sort(), bySource };
}

export function renderFeatureList(features: string[]): string {
  return features.map(f => `- ${f}`).join('\n');
}
