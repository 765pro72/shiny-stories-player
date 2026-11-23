(async()=>({title:StoryWorkshop.project.title,id:StoryWorkshop.project.id,status:document.querySelector('#writerStatus').textContent,saved:await(await fetch('/api/custom-stories')).json()}))()
