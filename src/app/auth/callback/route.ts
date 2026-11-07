import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { type NextRequest } from 'next/server';
import { finishAuthCallback, callbackFailure } from '@/lib/auth/callback';
export async function GET(request: NextRequest) {
 const url=new URL(request.url);
 const code=url.searchParams.get('code');
 const response=NextResponse.redirect(new URL('/login?error=callback',url.origin));
 response.headers.set('Cache-Control','private, no-store');
 if(url.searchParams.has('error')){
  const target=callbackFailure({code:url.searchParams.get('error_code')||url.searchParams.get('error')});
  response.headers.set('Location',new URL(target,url.origin).toString());
  return response;
 }
 const projectUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const db=projectUrl && key ? createServerClient(projectUrl,key,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll:values=>{values.forEach(({name,value,options})=>response.cookies.set(name,value,options));},
 }}) : null;
 if(code && db){
  const target=await finishAuthCallback(db,code,url.searchParams.get('next'),url.searchParams.get('sb_flow_id') ?? undefined);
  // Keep the exact response carrying session cookies when selecting the redirect.
  response.headers.set('Location',new URL(target,url.origin).toString());
  return response;
 }
 return response;
}
