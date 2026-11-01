// src/context/index-manager.ts
import { SemanticIndex, indexDirectory } from './semantic-indexer';

let index: SemanticIndex | null = null;

export const indexManager = {
  build(root: string): SemanticIndex {
    index = indexDirectory(root);
    return index;
  },
  get(): SemanticIndex | null { return index; },
  clear(): void { index = null; },
};
