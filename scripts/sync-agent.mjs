import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=path.join(root,"agent");
const target=path.join(root,"frontend","public","sp-manager-agent");
const publicRoot=path.resolve(root,"frontend","public");
if(path.dirname(path.resolve(target))!==publicRoot)throw new Error("Unexpected generated asset path");
if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw new Error("Generated asset directory must not be a symlink");
fs.mkdirSync(target,{recursive:true});
// These tracked public variants differ from canonical files in the supplied release.
// Preserve them so deduplication does not change the agent downloaded by existing POS users.
const preserved=new Set(["agent.ps1","install-windows.bat","SHA256.json"]);
for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  const destination=path.join(target,entry.name);
  if(entry.isFile()&&!(preserved.has(entry.name)&&fs.existsSync(destination)))fs.copyFileSync(path.join(source,entry.name),destination);
}
const restart=path.join(root,"frontend","public","RESTART-SP-MANAGER-LOCAL-AGENT.bat");
if(!fs.existsSync(restart))fs.copyFileSync(path.join(root,"RESTART-SP-MANAGER-LOCAL-AGENT.bat"),restart);
console.log("Agent public assets generated from canonical agent folder.");
