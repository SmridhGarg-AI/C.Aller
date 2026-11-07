import {serverSupabase} from '@/lib/supabase/server';
import {deleteHistoryRecord} from '@/lib/history-data';
import {createHistoryDeleteHandler} from '@/lib/history-delete-handler';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const db=await serverSupabase();return createHistoryDeleteHandler({user:async()=>{if(!db)return null;const {data,error}=await db.auth.getUser();return error?null:data.user?.id||null;},remove:async(userId,recordId)=>{if(!db)return false;return deleteHistoryRecord(db,userId,recordId);}})(request,id);}
