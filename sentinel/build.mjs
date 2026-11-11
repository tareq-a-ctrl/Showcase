import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));process.chdir(root);
for(const f of ['assets/hull-panels.ktx2','icons/icon-192.png','icons/icon-512.png']){try{await fs.access(f)}catch{await fs.writeFile(f,Buffer.from(await fs.readFile(f+'.b64','utf8'),'base64'))}}

const T=await import('three');
const shim=Object.keys(T).filter(k=>/^[$A-Z_a-z][$\w]*$/.test(k)).map(k=>'export const '+k+'=window.SentinelTHREE.'+k+';').join('\n');
await fs.writeFile('engine/three-shim.generated.js',shim);
const common={absWorkingDir:root,bundle:true,minify:true,format:'iife',target:'es2020',logLevel:'warning'};
await build({...common,entryPoints:['engine/vendor-three-entry.js'],outfile:'engine/three-r187.bundle.js'});
await build({...common,entryPoints:['engine/vendor-systems-entry.js'],outfile:'engine/systems.generated.js'});
let systems=await fs.readFile('engine/systems.generated.js','utf8');for(const name of ['room-transport.js','physics.js'])systems+='\n'+await fs.readFile('engine/'+name,'utf8');await fs.writeFile('engine/systems.bundle.js',systems);
await build({...common,entryPoints:['engine/vendor-ktx-entry.js'],plugins:[{name:'shared-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:path.join(root,'engine/three-shim.generated.js')}))}}],define:{'import.meta.url':JSON.stringify('https://offline.invalid/engine/KTX2Loader.js')},outfile:'engine/ktx2.generated.js'});
const base=path.join(root,'node_modules/three/examples/jsm/libs/basis');
const A={js:'data:text/javascript;base64,'+(await fs.readFile(path.join(base,'basis_transcoder.js'))).toString('base64'),wasm:'data:application/wasm;base64,'+(await fs.readFile(path.join(base,'basis_transcoder.wasm'))).toString('base64'),hull:(await fs.readFile('assets/hull-panels.ktx2')).toString('base64')};
await fs.writeFile('engine/ktx2-runtime.js',(await fs.readFile('engine/ktx2.generated.js','utf8'))+'\nwindow.SentinelKTXAssets='+JSON.stringify(A)+';\n'+await fs.readFile('engine/textures.js','utf8'));
await fs.copyFile('source.html','index.html');console.log('Built Three.js, Rapier, Colyseus, offline KTX2 decoder and game page.');

