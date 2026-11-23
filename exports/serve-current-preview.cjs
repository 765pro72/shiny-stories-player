require('F:/sc/server.cjs').start(undefined,18768).then(r=>console.log(r.url)).catch(e=>{console.error(e.message);process.exitCode=1})
