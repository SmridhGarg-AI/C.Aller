import {redirect} from 'next/navigation';
import {serverSupabase} from '@/lib/supabase/server';
import ProfileScreen from '@/components/profile-screen';
export const dynamic='force-dynamic';
export default async function Page(){const db=await serverSupabase();if(db){const {data:{user},error}=await db.auth.getUser();if(!user&&!error)redirect('/login');if(!user&&(error?.name==='AuthSessionMissingError'||error?.status===401||error?.status===403))redirect('/login');}return <ProfileScreen/>;}
