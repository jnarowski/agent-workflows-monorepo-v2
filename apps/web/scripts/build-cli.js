#!/usr/bin/env node

import { build } from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildCLI() {
  try {
    await build({
      entryPoints: [join(rootDir, 'src/cli/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: join(rootDir, 'dist/cli.js'),
      banner: {
        js: '#!/usr/bin/env node\n',
      },
      external: [
        '@prisma/client',
        'prisma',
      ],
      packages: 'external',
    });
    console.log('✓ Built CLI to dist/cli.js');
  } catch (error) {
    console.error('Failed to build CLI:', error);
    process.exit(1);
  }
}

buildCLI();
