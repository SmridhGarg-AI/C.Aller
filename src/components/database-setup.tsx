'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function DatabaseSetup({sql,editor}:{sql:string;editor:string}) {
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [ready,setReady]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(sql);setMessage('SQL copied. Paste it into a new Supabase SQL query and click Run.');}catch{setMessage('Copy was unavailable. Select and copy the SQL below.');}}
 async function check(){setBusy(true);try{const response=await fetch('/api/setup/status',{cache:'no-store'});const result=await response.json();setReady(result.ready===true);setMessage(result.message);}catch{setMessage('Connection check failed. Please retry.');}finally{setBusy(false);}}
 return <main style={{maxWidth:620,margin:'0 auto',padding:'40px 24px',color:'#3A312C'}}>
  <h1>Finish database setup</h1>
  <p>Your Supabase login and your app database are separate. Missing app tables prevent loading or saving your profile.</p>
  <ol><li>Copy the setup SQL below.</li><li>Open your Supabase SQL Editor, paste into a new query and click <strong>Run</strong>.</li><li>Return here and check the connection.</li></ol>
  <p>This script creates the app tables, private storage and row-level security. It preserves existing records. No secret key is needed.</p>
  <button onClick={()=>void copy()} style={{background:'#C96E4B',color:'white',padding:'12px 20px',borderRadius:16}}>Copy setup SQL</button>
  <p><a href={editor} target="_blank" rel="noreferrer">Open Supabase SQL Editor ↗</a></p>
  <details><summary>View or manually copy SQL</summary><textarea aria-label="Database setup SQL" readOnly value={sql} style={{width:'100%',height:260,marginTop:12}} onFocus={event=>event.currentTarget.select()}/></details>
  <p><button onClick={()=>void check()} disabled={busy}>{busy?'Checking…':'Check database connection'}</button></p>
  {message&&<p role="status">{message}</p>}
  {ready&&<p><Link href="/login">Continue to your account →</Link></p>}
 </main>;
}
