import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: {
    'dist/background': 'src/background/index.ts',
    'dist/content': 'src/content/index.ts',
    'dist/options': 'src/options/index.ts',
  },
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outdir: '.',
  legalComments: 'none',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[RecentTabSwitch] esbuild watching for changes…');
} else {
  await esbuild.build(options);
  console.log('[RecentTabSwitch] build complete');
}
