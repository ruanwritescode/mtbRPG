import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The game data (maps, items, races) lives in the repository root next to the original
// C++ game and is imported as raw text, so both versions read the same files.
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  base: './',
  server: { fs: { allow: [repoRoot] } },
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'node' },
});
