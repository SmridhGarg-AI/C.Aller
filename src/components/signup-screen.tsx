'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, LoaderCircle, MailCheck } from 'lucide-react';
import { browserSupabase, configured } from '@/lib/supabase/client';
import { postAuthDestination } from '@/lib/auth/flow';
import { createAccount, signupMessage, validateSignup } from '@/lib/auth/signup';
import styles from './signup-screen.module.css';
export default function SignupScreen(){
 const router=useRouter();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [pending,setPending]=useState(false);const [signedIn,setSignedIn]=useState(false);
 const [fields,setFields]=useState({name:'',email:'',password:''});
 const nameRef=useRef<HTMLInputElement>(null);const emailRef=useRef<HTMLInputElement>(null);const passwordRef=useRef<HTMLInputElement>(null);const errorRef=useRef<HTMLDivElement>(null);const lock=useRef(false);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 function client(){const db=browserSupabase();if(!db)throw new Error('unconfigured');return db;}
 function report(e:unknown){setError(e instanceof Error&&e.message==='unconfigured'?'Account creation is unavailable until Supabase is configured. Please contact the app owner.':signupMessage(e as {code?:string}));}
 async function continueOnboarding(){
  const db=client();const {data:{user},error}=await db.auth.getUser();if(error||!user)throw error||new Error('session missing');
  router.replace(await postAuthDestination(db,user.id));router.refresh();
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current)return;setError('');setMessage('');
  const validation=validateSignup(name,email,password);setFields(validation);
  for(const key of ['name','email','password'] as const){if(validation[key]){({name:nameRef,email:emailRef,password:passwordRef})[key].current?.focus();return;}}
  lock.current=true;setBusy('signup');
  try{
   const {data,error}=await createAccount(client(),name,email,password,location.origin);
   setPassword('');if(error)throw error;
   if(data.session){setSignedIn(true);try{await continueOnboarding();}catch{setError('Your account is signed in, but we couldn’t load your profile. Retry to continue.');}}
   else{setPending(true);setMessage('Check your email to continue. If this address can be registered, a verification link will arrive shortly. Check your spam folder and open the link in this browser. If you already have an account, sign in instead.');}
  }catch(e){report(e);}finally{lock.current=false;setBusy('');}
 }
 async function google(){
  if(lock.current)return;lock.current=true;setBusy('google');setError('');
  try{location.assign(new URL('/auth/google',location.origin).href);}
  catch(e){report(e);}finally{lock.current=false;setBusy('');}
 }
 async function resend(){
  if(lock.current)return;lock.current=true;setBusy('resend');setError('');
  try{const {error}=await client().auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:location.origin+'/auth/callback'}});if(error)throw error;setMessage('If verification is pending, another confirmation email has been requested. Check your inbox and spam folder.');}
  catch(e){report(e);}finally{lock.current=false;setBusy('');}
 }
 async function retry(){if(lock.current)return;lock.current=true;setBusy('retry');setError('');try{await continueOnboarding();}catch{setError('We couldn’t load your profile. Check your connection and retry.');}finally{lock.current=false;setBusy('');}}
 const locked=Boolean(busy);
 return <main className={styles.screen}><section className={styles.panel} aria-labelledby="signup-title">
  <header className={styles.heading}><h1 id="signup-title">Create your account</h1><p>Get started with Aller Matrix</p></header>
  {!pending&&!signedIn&&<form onSubmit={submit} noValidate aria-busy={locked} className={styles.form}>
   <div><label className={styles.srOnly} htmlFor="signup-name">Full name</label><input ref={nameRef} id="signup-name" name="name" autoComplete="name" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required readOnly={locked} maxLength={100} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name?'signup-name-error':undefined}/>{fields.name&&<p id="signup-name-error" className={styles.fieldError}>{fields.name}</p>}</div>
   <div><label className={styles.srOnly} htmlFor="signup-email">Email address</label><input ref={emailRef} id="signup-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required readOnly={locked} maxLength={254} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email?'signup-email-error':undefined}/>{fields.email&&<p id="signup-email-error" className={styles.fieldError}>{fields.email}</p>}</div>
   <div><label className={styles.srOnly} htmlFor="signup-password">Password</label><div className={styles.password}><input ref={passwordRef} id="signup-password" name="password" type={visible?'text':'password'} autoComplete="new-password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required readOnly={locked} maxLength={128} aria-invalid={Boolean(fields.password)} aria-describedby={fields.password?'signup-password-error':'signup-password-hint'}/><button type="button" disabled={locked} onClick={()=>setVisible(!visible)} aria-label={visible?'Hide password':'Show password'} aria-pressed={visible}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{fields.password?<p id="signup-password-error" className={styles.fieldError}>{fields.password}</p>:<p id="signup-password-hint" className={styles.hint}>10+ characters, with a letter and a number or symbol.</p>}</div>
   <button className={styles.primary} disabled={locked} type="submit">{busy==='signup'&&<LoaderCircle size={17} className={styles.spinner}/ >}{busy==='signup'?'Creating account…':'Create account'}</button>
  </form>}
  {pending&&<div className={styles.pending}><MailCheck size={34}/><h2>Check your inbox</h2></div>}
  {error&&<div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}><AlertCircle size={18}/><p>{error}</p></div>}
  {message&&<p role="status" className={styles.message}>{message}</p>}
  {pending&&<button type="button" className={styles.resend} onClick={()=>void resend()} disabled={locked}>{busy==='resend'?'Requesting email…':'Resend confirmation email'}</button>}
  {signedIn&&<button className={styles.primary} disabled={locked} onClick={()=>void retry()}>{busy==='retry'?'Loading profile…':'Continue to your profile'}</button>}
  {!signedIn&&<><div className={styles.separator}><span/>or<span/></div><button type="button" className={styles.google} onClick={()=>void google()} disabled={locked}>{busy==='google'?<LoaderCircle size={19} className={styles.spinner}/>:<span aria-hidden="true" className={styles.googleMark}>G</span>}{busy==='google'?'Connecting to Google…':'Continue with Google'}</button></>}
  <p className={styles.legal}>By creating an account, you agree to our<br/><Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
  {!configured&&<p className={styles.config}>Supabase is not configured. Account creation is unavailable.</p>}
  <p className={styles.signin}>Already have an account? <Link href="/login">Sign in</Link></p>
 </section></main>;
}
