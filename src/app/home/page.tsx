/* eslint-disable react-hooks/purity -- Dynamic server request timestamps are passed as stable props for hydration. */
import {redirect} from 'next/navigation';
import {serverSupabase} from '@/lib/supabase/server';
import {loadHome} from '@/lib/home-data';
import HomeScreen from '@/components/home-screen';
export const dynamic='force-dynamic';
export default async function HomePage(){
 const db=await serverSupabase();if(!db)return <HomeScreen name="" scans={[]} demo profileError={false} historyError={false} now={Date.now()}/>;
 const {data:{user},error}=await db.auth.getUser();if(!user){if(error&&error.name!=='AuthSessionMissingError'&&error.status!==401&&error.status!==403)return <HomeScreen name="" scans={[]} demo={false} profileError historyError now={Date.now()}/>;redirect('/login');}
 const result=await loadHome(db,user.id);const fallback=typeof user.user_metadata.full_name==='string'?user.user_metadata.full_name:'';
 return <HomeScreen name={result.name||fallback} scans={result.scans} demo={false} profileError={result.profileError} historyError={result.error} now={Date.now()}/>;
}
