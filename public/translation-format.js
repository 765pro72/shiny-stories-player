((root)=>{
 const instructions={
  '0_总则':'这是《闪耀色彩》离线播放器的补译工程。你只做一件事：把每行 original 的日文译成简体中文，写进同一行的 translation。禁止改动 story、file、id、original、speaker、previous、next、reference；禁止增删 rows；禁止改 format、version、instructions。整份文件必须仍是合法 JSON（UTF-8、无 BOM）。',
  '1_填写':'只填 translation（或 polished，最终润色稿优先于 translation）。译文要求：①简体中文、口语自然，保留角色语气与敬语远近（さん/ちゃん/先輩 等按语境处理，不要一律译成“先生/小姐”）；②original 里的 \\n 要在 translation 里还原为对应的换行，保持分段与停顿；③保留原有「」『』（）等括号和省略号、感叹号数量，不要自行增删标点；④拟声词、口癖、称呼、专有名词沿用文件里已有的译法（见 reference / existingTranslation / 同剧情其他行），不要另造译名；⑤人名按现有译文写（如 樱木真乃、月冈恋钟），不要音译成别的汉字。',
  '2_空格与指令行':'original 以 // 开头的是演出指令（背景、立绘、镜头、BGM、SE、转场），不是台词：translation 留空，不要翻译。original 只有符号（……、——、♪、☆、※ 等）或只有数字/编号时同样留空。已经是中文的行不要重复填写。',
  '3_保存':'另存为 UTF-8 的 .json（不要 BOM，不要 .txt/.docx）。可以只保留你完成的 rows，但 story、id、original 必须与本文件逐字一致。translation 为空的行导入时会被跳过，不会覆盖已有译文。',
  '4_导入':'剧情馆顶部「导入补译 JSON」用于跨剧情文件；每篇剧情旁的「导入文本」只接受该篇。选文件后先看预览：应显示「新增 N 句，覆盖本地补译 M 句」。若出现大量「未识别」，说明 story/id/original 被改过或被表格软件改写，请用原文件重填。点「应用补译」后需重播该剧情（或点「从头播放」）才生效。',
  '5_回滚':'「撤销上次补译」只撤销最近一次导入，且只回滚之后没被手动改过的句子；变更前后记录在 translation-work/ 的导入日志里，可逐条追溯。',
  '6_字段含义':'story=剧情编号（如 game_event_communications/400101704.json）；file=来源标题，仅用于署名归属；id=该行在脚本里的编号；speaker=说话人（可为空，旁白/独白常见）；original=日文原文，是导入时的唯一匹配键，一个字都不能改；translation=你要填的中文；polished=润色终稿（可选）；previous/next=前后文，帮助你判断语气；reference 或 existingTranslation=已有译文参考，不参与回填；review=审校备注，可留空。',
  '7_交付前自检':'①文件能被 JSON 解析；②rows 行数、story、id、original 与原件完全一致；③translation 里没有残留日文假名（人名/专名除外）；④没有把 // 指令行当台词翻译；⑤同一 story 下相同 original 的译文一致；⑥随机抽 5 行，连上 previous/next 读一遍是否通顺；⑦没有把简体写成繁体或反过来（本项目默认简体）。'
 };
 function bundle(rows,metadata={}){return{format:'shiny-translation-exchange',version:1,...metadata,instructions,rows:rows.map(r=>({...r,translation:r.translation||'',review:r.review||'',polished:r.polished||''}))}}
 const norm=s=>String(s||'').trim().replace(/\\r?\\n|\\n|\r\n/g,'\n').replace(/\n+/g,'\n');
 function extract(tracks,translation={},names={},common={}){const byId=new Map(),byText=new Map();for(const r of translation.rows||[]){if(!r.trans?.trim())continue;if(r.id&&!r.exactOnly&&!/^0+$/.test(r.id)&&r.id!=='select'){const a=byId.get(String(r.id))||[];a.push(r);byId.set(String(r.id),a)}byText.set(norm(r.text),norm(r.trans))}const rows=[];for(let i=0;i<tracks.length;i++){const t=tracks[i],text=t.text||t.select;if(!text)continue;const original=norm(text),match=byId.get(String(t.id)),tr=norm(match?.find(r=>norm(r.text)===original)?.trans)||(!match||match.length!==1?'':norm(match[0].trans))||byText.get(original)||common[original]||'';rows.push({id:String(t.id||i),speaker:names[t.speaker]||t.speaker||'选项',original,translation:tr})}return rows}
 const api={instructions,bundle,norm,extract};if(typeof module!=='undefined')module.exports=api;else root.TranslationFormat=api;
})(globalThis);
