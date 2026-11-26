import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { marked } from 'marked';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..', '..');
const markdown = await readFile(resolve(projectRoot, 'docs', 'Technical-Documentation.md'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HR Management System — Technical Documentation</title>
  <style>
    @page { size: A4; margin: 18mm 17mm; }
    body { color: #172033; font: 10.5pt/1.5 Arial, sans-serif; max-width: 190mm; margin: 0 auto; }
    h1 { color: #14365d; font-size: 24pt; line-height: 1.2; margin-top: 0; }
    h2 { color: #14365d; font-size: 16pt; margin-top: 24pt; page-break-after: avoid; }
    h3 { color: #24527a; font-size: 12pt; page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    table { border-collapse: collapse; width: 100%; margin: 10pt 0 16pt; font-size: 9pt; }
    th { background: #e8f0f8; text-align: left; }
    th, td { border: 1px solid #9aabba; padding: 5pt; vertical-align: top; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f3f6f9; padding: 8pt; font: 8.5pt/1.35 Consolas, monospace; }
    code { font: 9pt Consolas, monospace; background: #f3f6f9; }
    blockquote { border-left: 3px solid #4b83ad; margin: 10pt 0; padding: 4pt 12pt; }
    a { color: #205b88; text-decoration: none; }
    img { max-width: 100%; }
    figure { break-inside: avoid; }
  </style>
</head>
<body>
${marked.parse(markdown, { gfm: true, breaks: false })}
</body>
</html>`;
const outputDirectory = resolve(projectRoot, 'frontend', 'public');
await mkdir(outputDirectory, { recursive: true });
await copyFile(
  resolve(projectRoot, 'docs', 'hr-system-erd.svg'),
  resolve(outputDirectory, 'hr-system-erd.svg'),
);
await writeFile(resolve(outputDirectory, 'technical-documentation.html'), html, 'utf8');
console.log('Generated frontend/public/technical-documentation.html and ERD image');
