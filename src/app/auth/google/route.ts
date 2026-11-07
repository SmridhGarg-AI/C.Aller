import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
 const origin=request.nextUrl.origin;
 const response=NextResponse.redirect(new URL('/login?error=callback_network',origin));
 response.headers.set('Cache-Control','private, no-store');
 const project=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!project||!key)return response;
 const db=createServerClient(project,key,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll:values=>values.forEach(({name,value,options})=>response.cookies.set(name,value,options)),
 }});
 try {
  const {data,error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/auth/callback',skipBrowserRedirect:true}});
  if(!error&&data.url)response.headers.set('Location',data.url);
 }catch{/* Show a recoverable connection error without exposing tokens. */}
 return response;
}
