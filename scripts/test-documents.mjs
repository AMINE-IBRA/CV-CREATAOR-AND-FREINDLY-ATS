import { createRequire } from 'node:module';
import { dirname, resolve, relative, extname } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root,'server/package.json'));
const { transform } = require('esbuild');
const clientRoot = resolve(root,'client');
const outputRoot = resolve(clientRoot,'tests/.generated');
const visited = new Set();
async function compile(source) {
  const destination = resolve(outputRoot,relative(clientRoot,source)).replace(/\.[^.]+$/,'.mjs');
  if (visited.has(source)) return destination;
  visited.add(source);
  const result = await transform(await readFile(source,'utf8'),{loader:extname(source)==='.tsx'?'tsx':'ts',format:'esm',target:'es2022',jsx:'automatic'});
  let code = result.code;
  const imports = [...code.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+)['"]/g)];
  for (const match of imports) {
    const unresolved = resolve(dirname(source),match[1]);
    const dependency = [unresolved,`${unresolved}.ts`,`${unresolved}.tsx`,`${unresolved}.js`].find(path=>existsSync(path));
    if (!dependency) throw new Error(`Cannot resolve ${match[1]} from ${source}`);
    const compiled = await compile(dependency);
    let specifier = relative(dirname(destination),compiled).replaceAll('\\','/');
    if (!specifier.startsWith('.')) specifier=`./${specifier}`;
    code=code.replaceAll(`'${match[1]}'`,`'${specifier}'`).replaceAll(`"${match[1]}"`,`"${specifier}"`);
  }
  await mkdir(dirname(destination),{recursive:true});
  await writeFile(destination,code);
  return destination;
}
const target = await compile(resolve(clientRoot,'tests/resume.test.tsx'));
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), target], { cwd:root, stdio:'inherit', env:process.env });
process.exitCode = result.status ?? 1;
