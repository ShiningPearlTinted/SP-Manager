import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'build-assets.json'),'utf8'));
if(bundle.format!=='sp-manager-build-assets-v1'||!Array.isArray(bundle.assets)||bundle.assets.length!==18)throw new Error('Invalid build asset bundle');
const expected=new Set(['agent/agent.ps1','agent/autostart.ps1','agent/BACA-DAHULU.txt','agent/check-agent.bat','agent/diagnose-agent.bat','agent/display-fullscreen.ps1','agent/display-window.ps1','agent/install-current-user.ps1','agent/install-windows.bat','agent/SHA256.json','agent/watchdog.ps1','RESTART-SP-MANAGER-LOCAL-AGENT.bat','frontend/public/RESTART-SP-MANAGER-LOCAL-AGENT.bat','frontend/public/sp-manager-agent/agent.ps1','frontend/public/sp-manager-agent/install-windows.bat','frontend/public/sp-manager-agent/SHA256.json','frontend/public/vendor/xlsx.full.min.js','frontend/public/vendor/xlsx-LICENSE.txt']);
function writeAsset(relative,bytes){
 const target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep))throw new Error('Asset path escapes project');
 for(let p=target;p!==root;p=path.dirname(p)){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw new Error('Asset path cannot contain symlinks');}
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}
const overrides=new Set(['agent.ps1','install-windows.bat','SHA256.json']);
for(const asset of bundle.assets){
 if(!expected.delete(asset.path))throw new Error('Unknown or duplicate asset '+asset.path);
 const bytes=Buffer.from(asset.base64,'base64');
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('Corrupted build asset '+asset.path);
 writeAsset(asset.path,bytes);
 if(asset.path.startsWith('agent/')&&!overrides.has(path.posix.basename(asset.path)))writeAsset('frontend/public/sp-manager-agent/'+path.posix.basename(asset.path),bytes);
}
if(expected.size)throw new Error('Missing build assets');
console.log('Restored canonical agent, preserved public variants and Excel vendor assets (byte-exact).');
