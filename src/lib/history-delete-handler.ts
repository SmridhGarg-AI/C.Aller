import {historyId} from './history-data.ts';
type Dependencies={user:()=>Promise<string|null>;remove:(userId:string,id:string)=>Promise<boolean>};
export function createHistoryDeleteHandler(deps:Dependencies){return async(request:Request,id:string)=>{
 const reply=(body:object,status:number)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Request origin is not allowed.'},403);
 if(!historyId(id))return reply({error:'Invalid history record.'},400);
 try{const userId=await deps.user();if(!userId)return reply({error:'Sign in to manage history.'},401);if(!await deps.remove(userId,id))return reply({error:'This record is unavailable or was already deleted.'},404);return reply({deleted:true},200);}catch{return reply({error:'The record could not be deleted. Check your connection and retry.'},503);}
};}
