import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const compiler = resolve(root,'server/node_modules/typescript/bin/tsc');
const initialBuild = spawnSync(process.execPath,[compiler,'--project','tsconfig.json'],{cwd:resolve(root,'server'),stdio:'inherit'});
if(initialBuild.status!==0) process.exit(initialBuild.status ?? 1);
const children = [
  spawn(process.execPath, [compiler,'--project','tsconfig.json','--watch','--preserveWatchOutput'], {
    cwd: resolve(root, 'server'), stdio: 'inherit', env: process.env,
  }),
  spawn(process.execPath, ['--watch',resolve(root,'server/dist/index.js')],{
    cwd:resolve(root,'server'),stdio:'inherit',env:process.env,
  }),
  spawn(process.execPath, [resolve(root, 'client/node_modules/vite/bin/vite.js'), '--configLoader','runner','--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: resolve(root, 'client'), stdio: 'inherit', env: process.env,
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 300).unref();
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('CV Creator Pro: http://localhost:5173');
