import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = ['TOOLS/AUTO_POST_VIDEO', 'TOOLS/AUTO_RENDER_VIDEO'];
const sourceExtension = /\.(?:[cm]?js|tsx?|jsx)$/;
const ignoredDirs = new Set(['node_modules', '.next', '.git', 'out', 'build', 'c']);

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return ignoredDirs.has(entry.name) ? [] : sourceFiles(entryPath);
    return entry.isFile() && sourceExtension.test(entry.name) ? [entryPath] : [];
  });
}

function digest(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

const appFiles = new Map(apps.map((app) => [app, sourceFiles(path.join(root, app))]));
const sourceCount = [...appFiles.values()].reduce((total, files) => total + files.length, 0);
const oversized = [...appFiles.values()]
  .flat()
  .map((filePath) => ({ filePath, lines: readFileSync(filePath, 'utf8').split('\n').length }))
  .filter(({ lines }) => lines > 800)
  .sort((a, b) => b.lines - a.lines);

const byRelativePath = new Map();
for (const [app, files] of appFiles) {
  for (const filePath of files) {
    const appRelative = path.relative(path.join(root, app), filePath).split(path.sep).join('/');
    const entry = byRelativePath.get(appRelative) || [];
    entry.push({ app, filePath, hash: digest(filePath) });
    byRelativePath.set(appRelative, entry);
  }
}
const duplicated = [...byRelativePath.entries()]
  .filter(([, files]) => files.length === 2 && files[0].hash === files[1].hash)
  .map(([filePath]) => filePath);

const studioFiles = appFiles.get('TOOLS/AUTO_RENDER_VIDEO');
const legacyStudioImports = studioFiles
  .filter((filePath) => /@\/lib\//.test(readFileSync(filePath, 'utf8')))
  .map(relative);

const forbiddenInnerDependency = /(?:from|import)\s*['"][^'"]*(?:@\/src\/|(?:\.\.\/)+)(?:infrastructure|application|app|config)(?:\/|['"])/;
const domainViolations = sourceFiles(path.join(root, 'TOOLS/AUTO_RENDER_VIDEO/src/domain'))
  .filter((filePath) => forbiddenInnerDependency.test(readFileSync(filePath, 'utf8')))
  .map(relative);
const applicationViolations = sourceFiles(path.join(root, 'TOOLS/AUTO_RENDER_VIDEO/src/application'))
  .filter((filePath) => /(?:from|import)\s*['"][^'"]*(?:@\/src\/|(?:\.\.\/)+)infrastructure(?:\/|['"])/.test(readFileSync(filePath, 'utf8')))
  .map(relative);

console.log(`Architecture audit: ${sourceCount} source files`);
console.log(`Identical files across apps: ${duplicated.length}`);
console.log(`Oversized source files (>800 lines): ${oversized.length}`);
for (const item of oversized.slice(0, 10)) console.log(`  ${item.lines}\t${relative(item.filePath)}`);

if (legacyStudioImports.length) {
  console.error('Legacy Studio lib imports remain:');
  for (const filePath of legacyStudioImports) console.error(`  ${filePath}`);
  process.exitCode = 1;
}

if (domainViolations.length || applicationViolations.length) {
  console.error('Clean Architecture dependency-rule violations:');
  for (const filePath of domainViolations) console.error(`  domain -> outer layer: ${filePath}`);
  for (const filePath of applicationViolations) console.error(`  application -> infrastructure: ${filePath}`);
  process.exitCode = 1;
}
