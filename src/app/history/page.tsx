/* eslint-disable react-hooks/purity -- Server request timestamps provide stable hydration values. */
import {redirect} from 'next/navigation';
import {serverSupabase} from '@/lib/supabase/server';
import {historyFilters,loadHistoryPage,loadHistoryRecord} from '@/lib/history-data';
import HistoryScreen from '@/components/history-screen';
export const dynamic='force-dynamic';
export default async function HistoryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;const filters=historyFilters(query);const selectedId=typeof query.scan==='string'?query.scan:'';const db=await serverSupabase();
 const base={filters,selectedId,now:Date.now()};
 if(!db)return <HistoryScreen {...base} records={[]} total={0} selected={null} error={false} detailError={false} unconfigured/>;
 const {data:{user},error}=await db.auth.getUser();if(!user){if(error&&error.name!=='AuthSessionMissingError'&&error.status!==401&&error.status!==403)return <HistoryScreen {...base} records={[]} total={0} selected={null} error detailError={false} unconfigured={false}/>;redirect('/login');}
 const [list,detail]=await Promise.allSettled([loadHistoryPage(db,user.id,filters),selectedId?loadHistoryRecord(db,user.id,selectedId):Promise.resolve(null)]);
 return <HistoryScreen key={user.id} accountId={user.id} {...base} records={list.status==='fulfilled'?list.value.records:[]} total={list.status==='fulfilled'?list.value.total:0} selected={detail.status==='fulfilled'?detail.value:null} error={list.status==='rejected'} detailError={detail.status==='rejected'} unconfigured={false}/>;
}

