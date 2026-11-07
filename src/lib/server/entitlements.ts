import 'server-only';
import {serverSupabase} from '@/lib/supabase/server';
import {parseEntitlement} from '@/lib/entitlements';
export async function serverEntitlement(event?:string,barcode?:string){const db=await serverSupabase();if(!db)throw new Error('Supabase is not configured. Scan limits cannot be verified.');const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new Error('Sign in to use barcode scanning.');const {data,error:rpcError}=await db.rpc('barcode_entitlement',{scan_event:event||null,scan_barcode:barcode||null});if(rpcError)throw new Error('Scan usage could not be verified. Apply the entitlement migration and retry.');return parseEntitlement(data);}
