const fs=require('fs');let p='public/story-materials.js',s=fs.readFileSync(p,'utf8');
s=s.replace("selected=[],moods={};","selected=[],moods={},renderKey='',directoryKind='';");
s=s.replace("const nav=$('#materialDirectory');nav.replaceChildren();", "const nav=$('#materialDirectory'),scroll=directoryKind===kind?nav.scrollTop:0;directoryKind=kind;nav.replaceChildren();");
s=s.replace("usage===label);}\n }", "usage===label);}nav.scrollTop=scroll;\n }");
s=s.replace("else selected.push({...a,id:a.id||CustomStory.uid(),source:a.source||'builtin'});", "else selected.push({...a,id:a.id||(options.projectAssets||[]).find(x=>identity(x)===identity(a))?.id||CustomStory.uid(),source:a.source||'builtin'});");
s=s.replace("const host=$('#materialResults');host.replaceChildren();", "const host=$('#materialResults'),key=[kind,member,usage,mood,query,variant,page].join('|'),scroll=key===renderKey?host.scrollTop:0;renderKey=key;host.replaceChildren();");
s=s.replace("$('#materialDone').hidden=!options.multiple;", "host.scrollTop=scroll;$('#materialDone').hidden=!options.multiple;");
fs.writeFileSync(p,s);p='public/story-ai.js';s=fs.readFileSync(p,'utf8').replace("selected:materials,projectAssets:W().project.assets", "selected:materials,projectAssets:[...W().project.assets,...(candidate?.assets||[])]");fs.writeFileSync(p,s);
p='scripts/test-story-creative-next.cjs';s=fs.readFileSync(p,'utf8').replace("if(StoryMaterials.rows.length<3200||", "if(document.querySelector('.material-card').scrollHeight>document.querySelector('.material-card').clientHeight+2)throw Error('Material names clipped');if(StoryMaterials.rows.length<3200||");fs.writeFileSync(p,s);
