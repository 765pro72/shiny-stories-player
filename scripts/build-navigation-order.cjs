const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ranks={},dates={},groupPositions={};let position=0;
for(const file of fs.readdirSync(path.join(root,'research/Album/album')).filter(f=>f.endsWith('.json'))){
 const album=JSON.parse(fs.readFileSync(path.join(root,'research/Album/album',file),'utf8'));
 for(const list of album.continuousPlaybackLists||[])for(const event of list.events||[])ranks['produce_events/'+event.eventId+'.json']=Number(event.order);
}
const reference=JSON.parse(fs.readFileSync(path.join(root,'public/guide-reference.json'),'utf8'));
for(const year of reference.timeline)for(const entry of year.entries){for(const group of entry.groups){if(!dates[group]||dates[group]>entry.date)dates[group]=entry.date;if(groupPositions[group]===undefined)groupPositions[group]=position;}position++;}
fs.writeFileSync(path.join(root,'public/navigation-order.json'),JSON.stringify({ranks,dates,groupPositions,source:'Album continuousPlaybackLists + saved user story guide timeline'}));
console.log({ranks:Object.keys(ranks).length,datedGroups:Object.keys(dates).length});
