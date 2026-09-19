#!/usr/bin/env node

(async () => {
const fs = await import('node:fs');
const path = await import('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDES = [
  '/.git/',
  '/node_modules/',
  '/.next/',
  '/prisma/migrations/',
  '/app/generated/',
  '/.vercel/',
];

function shouldExclude(filePath) {
  const p = filePath.replace(/\\\\/g, '/');
  return EXCLUDES.some(ex => p.includes(ex));
}

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (shouldExclude(full)) continue;
    if (ent.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function replaceText(content) {
  // Order matters: replace longer/case-sensitive first
  return content
    .replace(/AFYVIA/g, 'AFYVIA')
    .replace(/Afyvia/g, 'Afyvia')
    .replace(/afyvia/g, 'afyvia');
}

function renamePath(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const newBase = base.replace(/afyvia/ig, (m) => {
    // preserve capitalization: if all caps -> AFYVIA, if capitalized -> Afyvia, else -> afyvia
    if (m === m.toUpperCase()) return 'AFYVIA';
    if (m[0] === m[0].toUpperCase()) return 'Afyvia';
    return 'afyvia';
  });
  const newPath = path.join(dir, newBase);
  if (newPath !== filePath) {
    fs.renameSync(filePath, newPath);
    return newPath;
  }
  return filePath;
}

const changedFiles = [];
walk(ROOT, (filePath) => {
  // only text files - quick heuristic by extension
  const textExt = ['.js', '.ts', '.jsx', '.tsx', '.css', '.md', '.json', '.env', '.html', '.txt', '.py'];
  if (!textExt.includes(path.extname(filePath)) && path.extname(filePath) !== '') return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const replaced = replaceText(content);
    if (replaced !== content) {
      fs.writeFileSync(filePath, replaced, 'utf8');
      changedFiles.push(filePath);
    }
  } catch {
    // skip binary or unreadable files
  }
});

// Now rename files that include afyvia/Afyvia
const renamed = [];
walk(ROOT, (filePath) => {
  const base = path.basename(filePath);
  if (/afyvia/i.test(base)) {
    try {
      const newPath = renamePath(filePath);
      if (newPath !== filePath) renamed.push({ from: filePath, to: newPath });
    } catch {
      // ignore rename errors
    }
  }
});

console.log('Replaced text in files:', changedFiles.length);
for (const f of changedFiles.slice(0, 100)) console.log('  ', path.relative(ROOT, f));
console.log('Renamed files:', renamed.length);
for (const r of renamed.slice(0, 100)) console.log('  ', path.relative(ROOT, r.from), '->', path.relative(ROOT, r.to));

if (changedFiles.length === 0 && renamed.length === 0) console.log('No changes made.');

process.exit(0);
})().catch((error) => {
  console.error('Afyvia replacement script failed:', error);
  process.exit(1);
});
