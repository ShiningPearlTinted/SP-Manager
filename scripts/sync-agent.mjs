import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=path.join(root,"agent");
const target=path.join(root,"frontend","public","sp-manager-agent");
const publicRoot=path.resolve(root,"frontend","public");
if(path.dirname(path.resolve(target))!==publicRoot)throw new Error("Unexpected generated asset path");
if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw new Error("Generated asset directory must not be a symlink");
fs.rmSync(target,{recursive:true,force:true});
fs.mkdirSync(target,{recursive:true});
for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  if(entry.isFile())fs.copyFileSync(path.join(source,entry.name),path.join(target,entry.name));
}
fs.copyFileSync(path.join(root,"RESTART-SP-MANAGER-LOCAL-AGENT.bat"),path.join(root,"frontend","public","RESTART-SP-MANAGER-LOCAL-AGENT.bat"));
console.log("Agent public assets generated from canonical agent folder.");
