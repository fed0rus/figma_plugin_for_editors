import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/plugin.ts'],
  bundle: true,
  outfile: 'code.js',
  format: 'iife',
  target: 'esnext',
  banner: { js: '/* global figma, console */' },
});
