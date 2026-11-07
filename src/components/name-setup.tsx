'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, LoaderCircle, AlertCircle } from 'lucide-react';
import { browserSupabase } from '@/lib/supabase/client';
import { ageOptions,draftKey,parseNameDraft,saveNameDraft,validateNameDraft,type NameDraft } from '@/lib/auth/onboarding-draft';
import styles from './name-setup.module.css';
const subscribe=()=>()=>{};
export default function NameSetup(props:{initial:NameDraft;userId:string|null;loadError:boolean}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 let local:NameDraft|null=null;let storageError=false;
 if(ready){try{local=parseNameDraft(JSON.parse(localStorage.getItem(draftKey(props.userId))||'null'));}catch{storageError=true;}}
 return ready?<NameForm {...props} initial={local||props.initial} storageError={storageError}/>:<main className={styles.screen} aria-busy="true"><span role="status" className={styles.loading}>Loading your profile…</span></main>;
}
function NameForm({initial,userId,loadError,storageError}:{initial:NameDraft;userId:string|null;loadError:boolean;storageError:boolean}){
 const router=useRouter();const [draft,setDraft]=useState(initial);const [fields,setFields]=useState({name:'',age:''});const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [localError,setLocalError]=useState(storageError);
 const nameRef=useRef<HTMLInputElement>(null);const ageRef=useRef<HTMLSelectElement>(null);const errorRef=useRef<HTMLDivElement>(null);const lock=useRef(false);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 function persist(value:NameDraft){try{localStorage.setItem(draftKey(userId),JSON.stringify(value));setLocalError(false);return true;}catch{setLocalError(true);return false;}}
 function change(key:keyof NameDraft,value:string){const next={...draft,[key]:value};setDraft(next);persist(next);}
 async function next(event:React.FormEvent){event.preventDefault();if(lock.current)return;setError('');const validation=validateNameDraft(draft);setFields(validation);if(validation.name){nameRef.current?.focus();return;}if(validation.age){ageRef.current?.focus();return;}
  const stored=persist(draft);lock.current=true;setBusy(true);
  try{const db=browserSupabase();if(db&&userId)await saveNameDraft(db,userId,draft);else if(!stored)throw new Error('Device storage is unavailable. Enable storage and try again.');router.push('/onboarding/diet');}
  catch{setError(userId?'We couldn’t save your profile. Your entries are still here. Check your connection and try again. If your session expired, sign in again.':'We couldn’t save your demo draft on this device. Enable browser storage and try again.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <main className={styles.screen}><form className={styles.panel} onSubmit={next} noValidate aria-busy={busy}>
  <header className={styles.header}><Link href={userId?"/profile":"/signup"} aria-label={userId?"Back to your account":"Back to create account"} onClick={()=>persist(draft)}><ArrowLeft size={19}/></Link><div className={styles.progress} role="progressbar" aria-label="Profile setup" aria-valuemin={0} aria-valuemax={100} aria-valuenow={25}><span/></div><span className={styles.step}>1/4</span></header>
  <h1>Let’s get to know you</h1><p className={styles.description}>This helps us give you personalised<br className={styles.linebreak}/> food recommendations.</p>
  <div className={styles.illustration} role="img" aria-label="A friendly cook waving beside fresh vegetables"/>
  <div className={styles.fields}><label htmlFor="onboarding-name">What’s your name?</label><input ref={nameRef} id="onboarding-name" autoComplete="name" placeholder="Enter your name" value={draft.name} maxLength={100} onChange={e=>change('name',e.target.value)} readOnly={busy} required aria-invalid={Boolean(fields.name)} aria-describedby={fields.name?'name-error':undefined}/>{fields.name&&<p id="name-error" className={styles.fieldError}>{fields.name}</p>}
  <label htmlFor="onboarding-age">How old are you?</label><div className={styles.select}><select ref={ageRef} id="onboarding-age" value={draft.age} onChange={e=>change('age',e.target.value)} disabled={busy} required aria-invalid={Boolean(fields.age)} aria-describedby={fields.age?'age-error':'age-hint'}><option value="" disabled>Select your age</option>{ageOptions.map(age=><option key={age} value={age}>{age}</option>)}</select><ChevronDown size={17}/></div>{fields.age&&<p id="age-error" className={styles.fieldError}>{fields.age}</p>}<p id="age-hint" className={styles.hint}>Just an age range — no birth date needed.</p></div>
  {!userId&&<p className={styles.note}>Demo mode · Saved on this device only.</p>}
  {loadError&&<p className={styles.note}>Cloud preferences couldn’t be loaded. Your entries will be retried when you select Next.</p>}
  {localError&&<p role="status" className={styles.note}>Device storage is unavailable. Unsaved edits may be lost on refresh.</p>}
  {error&&<div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}><AlertCircle size={18}/><div><p>{error}</p>{userId&&<Link href="/login">Sign in again</Link>}</div></div>}
  <button type="submit" className={styles.next} disabled={busy}>{busy?<><LoaderCircle size={17} className={styles.spinner}/>Saving…</>:error?'Try again':'Next'}</button>
 </form></main>;
}
