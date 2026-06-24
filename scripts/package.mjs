import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

/**
 * Bundles the unpacked extension into a Chrome Web Store-ready zip.
 *
 * Only the files Chrome actually loads are included — source, node_modules, and tooling
 * are left out. Run `npm run build` first so dist/ is up to date.
 */

// Files and folders that make up the loadable extension.
const CONTENTS = [
  'manifest.json',
  'options.html',
  'options.css',
  'dist',
  'icons',
];

// README-only assets that live alongside extension files but Chrome never loads.
const IGNORE = ['icons/screenshot.png'];

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const slug = pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const outDir = 'build';
const outFile = `${outDir}/${slug}-v${pkg.version}.zip`;

await rm(outFile, { force: true });
await mkdir(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

const done = new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('warning', reject);
  archive.on('error', reject);
});

archive.pipe(output);
for (const entry of CONTENTS) {
  const info = await stat(entry);
  if (info.isDirectory()) archive.glob(`${entry}/**/*`, { ignore: IGNORE, dot: false });
  else archive.file(entry, { name: entry });
}

await archive.finalize();
await done;

console.log(`[RecentTabSwitch] packaged ${outFile} (${archive.pointer()} bytes)`);
