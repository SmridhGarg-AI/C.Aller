'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Apple,HeartPulse,Heart,Activity,Circle,Ellipsis,Check,LoaderCircle,AlertCircle,LockKeyhole} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase/client';
import {medicalOptions,toggleMedical,validateMedical,saveMedical,profileMedical,nonMedicalPreferences,type MedicalDraft} from '@/lib/auth/medical-draft';
import styles from './medical-setup.module.css';
const icons=[Apple,HeartPulse,Heart,Activity,Circle,Ellipsis];
type Props={initial:MedicalDraft;userId:string|null;loadError:boolean;edit:boolean};
const subscribe=()=>()=>{};
export default function MedicalSetup(props:Props){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);let initial=props.initial;
 if(!props.userId&&!ready)return <main className={styles.screen} aria-busy="true"><p role="status">Loading optional preferences…</p></main>;
 if(!props.userId&&ready){try{const stored=JSON.parse(sessionStorage.getItem("aller-medical-demo")||"null");if(stored)initial=profileMedical({medical:stored.selected,medical_other:stored.other});}catch{/* No session draft available. */}}
 return <MedicalForm {...props} initial={initial}/>;
}
function MedicalForm({initial,userId,loadError,edit}:{initial:MedicalDraft;userId:string|null;loadError:boolean;edit:boolean}){
 const router=useRouter();const [draft,setDraft]=useState(initial);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const errorRef=useRef<HTMLDivElement>(null);const lock=useRef(false);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{try{const old=JSON.parse(localStorage.getItem("aller-preferences")||"null");if(old&&typeof old==="object")localStorage.setItem("aller-preferences",JSON.stringify(nonMedicalPreferences(old)));}catch{/* Do not require browser storage for private profile saves. */}},[]);
 async function next(e:React.FormEvent){e.preventDefault();if(lock.current)return;setError('');const invalid=validateMedical(draft);if(invalid){setError(invalid);return;}lock.current=true;setBusy(true);
 try{if(userId){const db=browserSupabase();if(!db)throw new Error();await saveMedical(db,userId,draft,edit);}else{sessionStorage.setItem('aller-medical-demo',JSON.stringify(draft));}
 router.push(edit?'/profile':'/onboarding/allergies');router.refresh();}
 catch{setError(userId?'We couldn’t save your choices. They are still here. Check your connection and try again, or sign in again if your session expired.':'Demo session storage is unavailable. Enable browser storage and try again.');}finally{lock.current=false;setBusy(false);}}
 return <main className={styles.screen}><form className={styles.panel} onSubmit={next} noValidate aria-busy={busy}>
 <header className={styles.header}><Link href={edit?'/profile':'/onboarding/diet'} aria-label={edit?'Back to Profile':'Back to dietary preferences'}><ArrowLeft size={19}/></Link><div className={styles.progress} role="progressbar" aria-label="Profile setup" aria-valuemin={0} aria-valuemax={100} aria-valuenow={75}><span/></div><span className={styles.step}>3/4</span></header>
 <h1>Medical issues</h1><p className={styles.description} id="medical-help">Select any that apply.</p>
 <fieldset className={styles.choices} aria-describedby="medical-help medical-optional"><legend className={styles.srOnly}>Optional medical conditions</legend><div className={styles.grid}>{medicalOptions.map((option,i)=>{const Icon=icons[i];const selected=draft.selected.includes(option);return <button key={option} type="button" className={`${styles.choice} ${selected?styles.selected:''}`} aria-pressed={selected} disabled={busy} onClick={()=>{setDraft(toggleMedical(draft,option));setError('');}}><Icon size={27} strokeWidth={1.7} aria-hidden="true" className={styles[`icon${i}`]}/><span>{option}</span>{selected&&<Check size={13} aria-hidden="true" className={styles.check}/>}</button>;})}</div></fieldset>
 {draft.selected.includes('Other')&&<div className={styles.other}><label htmlFor="medical-other">Other condition <span>(optional)</span></label><input id="medical-other" placeholder="Add a condition, if you wish" value={draft.other} maxLength={120} readOnly={busy} onChange={e=>setDraft({...draft,other:e.target.value})} aria-describedby="medical-other-help"/><p id="medical-other-help">Up to 120 characters. You can leave this blank.</p></div>}
 <p id="medical-optional" className={styles.hint}>Entirely optional. Leave everything unselected if you prefer not to share. Selecting None clears other choices.</p>
 <p className={styles.privacy}><LockKeyhole size={15}/><span>Saved privately to your profile. Never automatically sent to AI or analytics. You can edit or clear these choices in Profile.</span></p>
 {!userId&&<p className={styles.note}>Demo mode · Saved only for this browser tab’s session.</p>}
 {loadError&&<p role="status" className={styles.note}>Your saved conditions couldn’t be loaded. Reload before editing to avoid replacing existing choices.</p>}
 {error&&<div ref={errorRef} role="alert" tabIndex={-1} className={styles.error}><AlertCircle size={18}/><div><p>{error}</p>{userId&&<Link href="/login">Sign in again</Link>}</div></div>}
 {loadError?<button type="button" className={styles.next} onClick={()=>window.location.reload()}>Retry loading choices</button>:<button type="submit" className={styles.next} disabled={busy}>{busy?<><LoaderCircle size={17} className={styles.spinner}/>Saving…</>:error?'Try again':edit?'Save changes':'Next'}</button>}
 </form></main>;
}
