const KEY=process.env.LINEAR_API_KEY;
if(!KEY)throw new Error("LINEAR_API_KEY is not set");
async function gql(q){
  const r=await fetch("https://api.linear.app/graphql",{method:"POST",headers:{"Content-Type":"application/json","Authorization":KEY},body:JSON.stringify({query:q})});
  const j=await r.json();
  if(j.errors)throw new Error(JSON.stringify(j.errors));
  return j.data;
}
function weekRange(){
  const now=new Date(),diff=now.getDay()===0?-6:1-now.getDay();
  const mon=new Date(now);mon.setDate(now.getDate()+diff);mon.setHours(0,0,0,0);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);
  return{from:mon.toISOString(),to:sun.toISOString()};
}
const data=await gql(`{projects(first:10){nodes{id name state progress issues(first:25){nodes{id title completedAt dueDate state{type} assignee{name}}}}}}`);
const{from,to}=weekRange();
const fromD=new Date(from),toD=new Date(to),today=new Date();
let totalCompleted=0,totalInProgress=0,totalOverdue=0;
const projects=data.projects.nodes.map(proj=>{
  const issues=proj.issues.nodes;
  const completedThisWeek=issues.filter(i=>i.completedAt&&new Date(i.completedAt)>=fromD&&new Date(i.completedAt)<=toD);
  const inProgress=issues.filter(i=>i.state.type==="started"||i.state.type==="unstarted");
  const overdue=inProgress.filter(i=>i.dueDate&&new Date(i.dueDate)<today);
  totalCompleted+=completedThisWeek.length;totalInProgress+=inProgress.length;totalOverdue+=overdue.length;
  return{id:proj.id,name:proj.name,state:proj.state,progress:Math.round((proj.progress||0)*100),totalIssues:issues.length,completedIssues:issues.filter(i=>i.state.type==="completed").length,completedThisWeek:completedThisWeek.map(i=>({title:i.title,completedAt:i.completedAt,assignee:i.assignee?.name||null})),overdue:overdue.map(i=>({title:i.title,dueDate:i.dueDate}))};
});
process.stdout.write(JSON.stringify({generatedAt:new Date().toISOString(),weekFrom:from,weekTo:to,summary:{totalCompleted,totalInProgress,totalOverdue,overallProgress:Math.round(projects.reduce((a,p)=>a+p.progress,0)/(projects.length||1))},projects},null,2));
