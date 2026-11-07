import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase/server';

export async function GET() {
 const headers={'Cache-Control':'private, no-store'};
 const db=await serverSupabase();
 if(!db)return NextResponse.json({ready:false,message:'Supabase URL and publishable key are not configured.'},{headers});
 const tables=['profiles','scan_history','favorites','user_entitlements','barcode_usage','barcode_usage_events','chat_rate_limits','account_deletion_requests'];
 try {
  const results=await Promise.all(tables.map(async table=>{
   const {error}=await db.from(table).select('*').limit(0);
   // These internal tables deliberately have no client grants.
   if(error?.code==='42501' && ['chat_rate_limits','barcode_usage_events'].includes(table))return null;
   return error?{table,missing:error.code==='PGRST205'||error.code==='42P01'}:null;
  }));
  const errors=results.filter(value=>value!==null);
  return NextResponse.json({ready:errors.length===0,message:errors.length?`Database setup is incomplete or inaccessible: ${errors.map(e=>e.table).join(', ')}. Run the setup SQL, then check again.`:'Database tables are available. Continue to sign in.'},{headers});
 }catch{return NextResponse.json({ready:false,message:'Could not connect to Supabase. Check your connection and project health.'},{headers});}
}
