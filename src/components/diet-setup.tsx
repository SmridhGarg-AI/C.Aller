'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Leaf,Sprout,Fish,Moon,WheatOff,Bean,Box,Ellipsis,Check,LoaderCircle,AlertCircle} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase/client';
import {dietOptions,dietDraftKey,dietConflicts,parseDietDraft,validateDietDraft,saveDietDraft,clarificationOptions,type DietDraft} from '@/lib/auth/diet-draft';
import styles from './diet-setup.module.css';
const subscribe=()=>()=>{};
const icons=[Leaf,Sprout,Fish,Moon,Bean,WheatOff,Box,Ellipsis];
export default function DietSetup(props:{initial:DietDraft;userId:string|null;loadError:boolean}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);let initial=props.initial;let storageError=false;
 if(ready){try{initial=parseDietDraft(JSON.parse(localStorage.getItem(dietDraftKey(props.userId))||'null'))||initial;}catch{storageError=true;}}
 return ready?<DietForm {...props} initial={initial} storageError={storageError}/>:<main className={styles.screen} aria-busy="true"><p role="status" className={styles.loading}>Loading dietary preferences…</p></main>;
}
function DietForm({initial,userId,loadError,storageError}:{initial:DietDraft;userId:string|null;loadError:boolean;storageError:boolean}){
 const router=useRouter();const [draft,setDraft]=useState(initial);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [localError,setLocalError]=useState(storageError);const errorRef=useRef<HTMLDivElement>(null);const lock=useRef(false);const otherRef=useRef<HTMLInputElement>(null);
 const conflicts=dietConflicts(draft.selected);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 function persist(value:DietDraft){try{localStorage.setItem(dietDraftKey(userId),JSON.stringify(value));setLocalError(false);return true;}catch{setLocalError(true);return false;}}
 function change(value:DietDraft){setDraft(value);setError('');persist(value);}
 function toggle(option:string){change({...draft,selected:draft.selected.includes(option)?draft.selected.filter(x=>x!==option):[...draft.selected,option],clarification:''});}
 async function next(e:React.FormEvent){e.preventDefault();if(lock.current)return;setError('');const validation=validateDietDraft(draft);if(validation){setError(validation);if(draft.selected.includes('Other')&&draft.other.trim().length<2)otherRef.current?.focus();return;}
  const stored=persist(draft);lock.current=true;setBusy(true);
  try{const db=browserSupabase();if(userId){if(!db)throw new Error();await saveDietDraft(db,userId,draft);}else if(!stored)throw new Error();router.push('/onboarding/medical');}
  catch{setError(userId?'We couldn’t save your dietary preferences. Your selections are still here. Check your connection and try again, or sign in again if your session expired.':'We couldn’t save your demo preferences. Enable browser storage and try again.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <main className={styles.screen}><form className={styles.panel} onSubmit={next} noValidate aria-busy={busy}>
  <header className={styles.header}><Link href="/onboarding/name" aria-label="Back to name and age" onClick={()=>persist(draft)}><ArrowLeft size={19}/></Link><div className={styles.progress} role="progressbar" aria-label="Profile setup" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}><span/></div><span className={styles.step}>2/4</span></header>
  <h1>Your dietary preferences</h1><p className={styles.description} id="diet-help">Select all that apply.</p>
  <fieldset className={styles.choices} aria-describedby="diet-help"><legend className={styles.srOnly}>Dietary preferences</legend><div className={styles.grid}>{dietOptions.map((option,i)=>{const Icon=icons[i];const selected=draft.selected.includes(option);return <button className={`${styles.choice} ${selected?styles.selected:''}`} type="button" key={option} aria-pressed={selected} disabled={busy} onClick={()=>toggle(option)}><Icon size={26} strokeWidth={1.6} className={styles[`icon${i}`]} aria-hidden="true"/><span>{option}</span>{selected&&<Check size={13} className={styles.check} aria-hidden="true"/>}</button>;})}</div></fieldset>
  {draft.selected.includes('Other')&&<div className={styles.other}><label htmlFor="other-diet">Your other dietary preference</label><input ref={otherRef} id="other-diet" value={draft.other} onChange={e=>change({...draft,other:e.target.value})} placeholder="e.g. Mediterranean" maxLength={120} required readOnly={busy} aria-describedby="other-diet-help"/><p id="other-diet-help">Describe your preference in 2–120 characters.</p></div>}
  {conflicts.length>0&&<fieldset className={styles.clarification}><legend>Help us understand your choices</legend><p>{conflicts.join('; ')} can mean different things: pescatarian includes fish, while vegetarian and vegan usually exclude it. How should we interpret these together? You can also change your selections above.</p>{clarificationOptions.map(option=><label key={option}><input type="radio" name="diet-clarification" value={option} checked={draft.clarification===option} disabled={busy} onChange={()=>change({...draft,clarification:option})}/><span>{option}</span></label>)}</fieldset>}
  <p className={styles.hint}>You can leave all options unselected.</p>
  {!userId&&<p className={styles.note}>Demo mode · Saved on this device only.</p>}{loadError&&<p className={styles.note}>Cloud preferences couldn’t be loaded. Next will retry the profile connection.</p>}{localError&&<p role="status" className={styles.note}>Device storage is unavailable. Edits may be lost on refresh.</p>}
  {error&&<div ref={errorRef} role="alert" tabIndex={-1} className={styles.error}><AlertCircle size={18}/><div><p>{error}</p>{userId&&<Link href="/login">Sign in again</Link>}</div></div>}
  <button type="submit" className={styles.next} disabled={busy}>{busy?<><LoaderCircle size={17} className={styles.spinner}/>Saving…</>:error?'Try again':'Next'}</button>
 </form></main>;
}
