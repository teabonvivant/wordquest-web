const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(process.argv[2]);
const ctx={};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const i of [2,3,4,6,23,25,27]) vm.runInContext(fs.readFileSync(path.join(root,'01_English_V32/source/script_'+String(i).padStart(2,'0')+'.js'),'utf8'),ctx,{timeout:10000});
const dir=path.join(root,'01_English_V32/data');fs.mkdirSync(dir,{recursive:true});
const summary=[];
for(const k of Object.keys(ctx).filter(k=>k.startsWith('WQ') && typeof ctx[k]!=='function')){
 const value=ctx[k];const output=path.join(dir,k+'.json');fs.writeFileSync(output,JSON.stringify(value,null,2)+'\n');
 summary.push({name:k,file:path.relative(root,output),items:Array.isArray(value)?value.length:Object.keys(value||{}).length});
}
const m={};m.globalThis=m;vm.createContext(m);vm.runInContext(fs.readFileSync(path.join(root,'02_Maths_0.1.2/source/script_00.js'),'utf8'),m,{timeout:10000});
fs.writeFileSync(path.join(root,'02_Maths_0.1.2/source/curriculum.json'),JSON.stringify(m.WQMathData,null,2)+'\n');
fs.writeFileSync(path.join(root,'02_Maths_0.1.2/source/maths.css'),m.WQMathCSS+'\n');
fs.writeFileSync(path.join(root,'05_Documentation/data_inventory.json'),JSON.stringify({english:summary,mathsKeys:Object.keys(m.WQMathData),mathsVersion:m.WQMathData.version},null,2)+'\n');
console.log(JSON.stringify(summary));