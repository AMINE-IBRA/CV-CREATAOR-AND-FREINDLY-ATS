import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const children=[
  spawn(process.execPath,['dist/index.js'],{cwd:resolve(root,'server'),stdio:'inherit'}),
  spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--configLoader','runner','--host','127.0.0.1','--port','5173','--strictPort'],{cwd:resolve(root,'client'),stdio:'inherit'}),
];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();setTimeout(()=>process.exit(code),300).unref();}
for(const child of children){child.on('error',e=>{console.error(e.message);stop(1)});child.on('exit',code=>{if(!stopping)stop(code??1)});}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
console.log('CV Creator Pro: http://localhost:5173');
