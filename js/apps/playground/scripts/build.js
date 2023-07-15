const esbuild = require('esbuild');
esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    outfile: './build/index.js',
    bundle: true,
    minify: false,
    platform: 'node',
    sourcemap: true,
    target: 'node14',
    plugins: [],
  })
  .catch(() => process.exit(1));
