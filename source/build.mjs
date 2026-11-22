import * as esbuild from 'esbuild'; import fs from 'fs';
fs.mkdirSync('site', { recursive: true });
await esbuild.build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', outfile: 'site/app.js', target: 'es2019', charset: 'utf8', legalComments: 'none' });
for (const f of ['index.html', 'style.css', 'icon.svg']) fs.copyFileSync('src/' + f, 'site/' + f);
fs.copyFileSync('node_modules/html2canvas/dist/html2canvas.min.js', 'site/html2canvas.min.js');
console.log('built', fs.statSync('site/app.js').size);
