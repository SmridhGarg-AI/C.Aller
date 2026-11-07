'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, AlertCircle, MailCheck } from 'lucide-react';
import { browserSupabase, configured } from '@/lib/supabase/client';
import { authMessage, postAuthDestination, validateLogin } from '@/lib/auth/flow';
import styles from './auth-screen.module.css';

type Mode = 'login' | 'forgot' | 'reset';
export default function AuthScreen({mode,initialError='',initialMessage=''}:{mode:Mode;initialError?:string;initialMessage?:string}) {
 const router=useRouter();
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState('');
 const [error,setError]=useState(initialError);
 const [message,setMessage]=useState(initialMessage);
 const [verify,setVerify]=useState(false);
 const [fields,setFields]=useState({email:'',password:'',confirmation:''});
 const errorRef=useRef<HTMLDivElement>(null);
 const emailRef=useRef<HTMLInputElement>(null);
 const passwordRef=useRef<HTMLInputElement>(null);
 const confirmationRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 const locked=Boolean(busy);
 function client(){const db=browserSupabase();if(!db)throw new Error('unconfigured');return db;}
 function report(e:unknown){setError(e instanceof Error && e.message==='unconfigured'?'Sign-in is unavailable until Supabase is configured. Please contact the app owner.':authMessage(e as {code?:string}));}
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(locked)return;
  setError('');setMessage('');setVerify(false);
  const validation=validateLogin(email,password);
  const next={email:mode==='reset'?'':validation.email,password:mode==='forgot'?'':mode==='reset'?(password.length<8?'Use at least 8 characters for your new password.':''):validation.password,confirmation:mode==='reset'&&password!==confirmation?'Passwords do not match.':''};
  setFields(next);
  if(next.email){emailRef.current?.focus();return;}
  if(next.password){passwordRef.current?.focus();return;}
  if(next.confirmation){confirmationRef.current?.focus();return;}
  setBusy('submit');
  try{
   const db=client();
   if(mode==='forgot'){
    const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+'/auth/callback?next=/reset-password'});
    if(error)throw error;
    setMessage('If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder, and open it in this browser.');
   }else if(mode==='reset'){
    const {error}=await db.auth.updateUser({password});if(error)throw error;
    const {error:signOutError}=await db.auth.signOut({scope:'local'});
    setPassword('');setConfirmation('');
    if(signOutError){setMessage('Your password was updated. You are still signed in.');return;}
    router.replace('/login?reset=success');router.refresh();return;
   }else{
    const {data,error}=await db.auth.signInWithPassword({email:email.trim(),password});
    if(error){setVerify(error.code==='email_not_confirmed');throw error;}
    if(!data.user || !data.session)throw new Error('session missing');
    setPassword('');
    try{const destination=await postAuthDestination(db,data.user.id);router.replace(destination);router.refresh();return;}
    catch{setError('You’re signed in, but we couldn’t load your profile. Retry to continue.');return;}
   }
  }catch(e){report(e);}finally{setBusy('');}
 }
 async function google(){
  if(locked)return;setError('');setMessage('');setBusy('google');
  try{location.assign(new URL('/auth/google',location.origin).href);}
  catch(e){report(e);}finally{setBusy('');}
 }
 async function resend(){
  if(locked)return;setError('');setMessage('');setBusy('resend');
  try{const {error}=await client().auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:location.origin+'/auth/callback'}});if(error)throw error;setMessage('If confirmation is pending, a new verification email has been requested. Check your inbox and spam folder.');}
  catch(e){report(e);}finally{setBusy('');}
 }
 async function retryProfile(){
  if(locked)return;setError('');setBusy('profile');
  try{const db=client();const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(!user)throw new Error('missing session');router.replace(await postAuthDestination(db,user.id));router.refresh();}
  catch{setError('We couldn’t load your profile. Check your connection and retry.');}finally{setBusy('');}
 }
 const login=mode==='login';
 return <main className={styles.screen}>
  <section className={styles.panel} aria-labelledby="auth-title">
   {!login&&<Link href="/login" className={styles.back}><ArrowLeft size={18}/>Back to sign in</Link>}
   <header className={styles.heading}>
    {login?<><p className={styles.welcome}>Welcome to</p><h1 id="auth-title">Aller <span>Matrix</span></h1><p className={styles.subtitle}>Create an account or sign in<br/>to continue</p></>:<><h1 id="auth-title" className={styles.recoveryTitle}>{mode==='forgot'?'Forgot password?':'Set a new password'}</h1><p className={styles.subtitle}>{mode==='forgot'?'Enter your email and we’ll send you a reset link.':'Choose a new password for your account.'}</p></>}
   </header>
   {login&&<><button type="button" className={styles.google} onClick={()=>void google()} disabled={locked}>{busy==='google'?<LoaderCircle size={20} className={styles.spinner}/>:<GoogleMark/>}<span>{busy==='google'?'Connecting to Google…':'Continue with Google'}</span></button><div className={styles.separator}><span/>or<span/></div></>}
   <form noValidate onSubmit={submit} className={styles.form} aria-busy={locked}>
    {mode!=='reset'&&<div className={styles.field}><label className={styles.srOnly} htmlFor="auth-email">Email address</label><input ref={emailRef} id="auth-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} readOnly={locked} required aria-invalid={Boolean(fields.email)} aria-describedby={fields.email?'email-error':undefined}/>{fields.email&&<p id="email-error" className={styles.fieldError}>{fields.email}</p>}</div>}
    {mode!=='forgot'&&<div className={styles.field}><label className={styles.srOnly} htmlFor="auth-password">{login?'Password':'New password'}</label><div className={styles.password}><input ref={passwordRef} id="auth-password" name="password" type={visible?'text':'password'} autoComplete={login?'current-password':'new-password'} placeholder={login?'Password':'New password'} value={password} onChange={e=>setPassword(e.target.value)} readOnly={locked} required aria-invalid={Boolean(fields.password)} aria-describedby={fields.password?'password-error':mode==='reset'?'password-hint':undefined}/><button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)} disabled={locked}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{fields.password&&<p id="password-error" className={styles.fieldError}>{fields.password}</p>}{mode==='reset'&&<p id="password-hint" className={styles.hint}>Use at least 8 characters.</p>}</div>}
    {mode==='reset'&&<div className={styles.field}><label className={styles.srOnly} htmlFor="auth-confirmation">Confirm new password</label><input ref={confirmationRef} id="auth-confirmation" type={visible?'text':'password'} autoComplete="new-password" placeholder="Confirm new password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} readOnly={locked} required aria-invalid={Boolean(fields.confirmation)} aria-describedby={fields.confirmation?'confirmation-error':undefined}/>{fields.confirmation&&<p id="confirmation-error" className={styles.fieldError}>{fields.confirmation}</p>}</div>}
    {login&&<Link href="/forgot-password" className={styles.forgot}>Forgot password?</Link>}
    <button className={styles.primary} type="submit" disabled={locked}>{busy==='submit'&&<LoaderCircle size={17} className={styles.spinner}/ >}{busy==='submit'?(login?'Signing in…':mode==='forgot'?'Sending link…':'Updating password…'):(login?'Sign in':mode==='forgot'?'Send reset link':'Update password')}</button>
   </form>
   {error&&<div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}><AlertCircle size={17}/><p>{error}</p></div>}
   {verify&&<button type="button" className={styles.inlineButton} onClick={()=>void resend()} disabled={locked}>{busy==='resend'?'Requesting email…':'Resend verification email'}</button>}
   {login&&error.includes('profile')&&<button type="button" className={styles.inlineButton} onClick={()=>void retryProfile()} disabled={locked}>{busy==='profile'?'Loading profile…':'Retry loading profile'}</button>}
   {message&&<div role="status" className={styles.success}><MailCheck size={18}/><p>{message}</p></div>}
   {!configured&&<p className={styles.configNote}>Authentication is not configured yet. No demo sign-in is performed.</p>}
   {login&&<p className={styles.create}>Don’t have an account? <Link href="/signup">Create one</Link></p>}
  </section>
 </main>;
}
function GoogleMark(){return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.62.39 3.15 1.06 4.51l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;}
