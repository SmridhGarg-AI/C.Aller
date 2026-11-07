'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Plus,X,Check,LoaderCircle,AlertCircle} from 'lucide-react';
import {browserSupabase} from '@/lib/supabase/client';
import {allergyOptions,allergyDraftKey,parseAllergyDraft,validateAllergies,customAllergyError,normalizeAllergy,finishAllergies,type AllergyDraft} from '@/lib/auth/allergy-draft';
import styles from './allergy-setup.module.css';
const illustrations=['🥛','🥚','🥜','🌰','🐟','🦐','🌾','🫛','🫘'];
const subscribe=()=>()=>{};
export default function AllergySetup(props:{initial:AllergyDraft;userId:string|null;loadError:boolean}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);let initial=props.initial;
 // Demo drafts use session storage. Authenticated allergy data lives only in Supabase.
 if(!props.userId&&!ready)return <main className={styles.screen} aria-busy="true"><p role="status">Loading allergies…</p></main>;
 if(!props.userId&&ready){try{initial=parseAllergyDraft(JSON.parse(sessionStorage.getItem(allergyDraftKey(null))||'null'))||initial;}catch{/* Draft storage is optional until Finish. */}}
 return <AllergyForm {...props} initial={initial}/>;
}
function AllergyForm({initial,userId,loadError}:{initial:AllergyDraft;userId:string|null;loadError:boolean}){
 const router=useRouter();const [draft,setDraft]=useState(initial);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [open,setOpen]=useState(false);const errorRef=useRef<HTMLDivElement>(null);const addRef=useRef<HTMLButtonElement>(null);const lock=useRef(false);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 function change(value:AllergyDraft){setDraft(value);setError('');if(!userId){try{sessionStorage.setItem(allergyDraftKey(null),JSON.stringify(value));}catch{/* Finish reports unavailable storage. */}}}
 async function finish(e:React.FormEvent){e.preventDefault();if(lock.current)return;const invalid=validateAllergies(draft);setError(invalid);if(invalid)return;lock.current=true;setBusy(true);
 try{if(userId){const db=browserSupabase();if(!db)throw new Error();await finishAllergies(db,userId,draft);}else{sessionStorage.setItem(allergyDraftKey(null),JSON.stringify(draft));sessionStorage.setItem('aller-onboarding-demo-completed','true');}router.replace('/loading');router.refresh();}
 catch{setError(userId?'Your profile could not be saved. Your selections are still here. Check your connection and try again, or sign in again if your session expired.':'Demo storage is unavailable. Enable browser storage and try again.');}finally{lock.current=false;setBusy(false);}}
 function close(){setOpen(false);addRef.current?.focus();}
 return <main className={styles.screen}><form className={styles.panel} onSubmit={finish} noValidate aria-busy={busy}>
 <header className={styles.header}><Link href="/onboarding/medical" aria-label="Back to medical issues"><ArrowLeft size={19}/></Link><div className={styles.progress} role="progressbar" aria-label="Profile setup" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><span/></div><span className={styles.step}>4/4</span></header>
 <h1>Your allergies</h1><p className={styles.description} id="allergy-help">Select all that apply or add your own</p>
 <fieldset className={styles.choices} aria-describedby="allergy-help"><legend className={styles.srOnly}>Allergies</legend><div className={styles.grid}>{allergyOptions.map((option,i)=>{const selected=draft.selected.includes(option);return <button key={option} type="button" className={`${styles.choice} ${selected?styles.selected:''}`} aria-pressed={selected} disabled={busy} onClick={()=>change({...draft,noKnown:false,selected:selected?draft.selected.filter(x=>x!==option):[...draft.selected,option]})}><span className={styles.illustration} aria-hidden="true">{illustrations[i]}</span><span>{option}</span>{selected&&<Check size={13} className={styles.check} aria-hidden="true"/>}</button>;})}</div></fieldset>
 <button type="button" ref={addRef} className={styles.add} disabled={busy} onClick={()=>setOpen(true)}><Plus size={18}/>Add custom allergy</button>
 {draft.custom.length>0&&<ul className={styles.custom} aria-label="Custom allergies">{draft.custom.map(item=><li key={item}><span>{item}</span><button type="button" aria-label={`Remove ${item}`} disabled={busy} onClick={()=>change({...draft,custom:draft.custom.filter(x=>x!==item)})}><X size={15}/></button></li>)}</ul>}
 <label className={styles.noKnown}><input type="checkbox" checked={draft.noKnown} disabled={busy} onChange={e=>change(e.target.checked?{selected:[],custom:[],noKnown:true}:{...draft,noKnown:false})}/><span>No known allergies</span></label><p className={styles.hint}>Choose this only if you have no known allergies. It clears selected and custom allergies; it does not confirm that any food is safe.</p>
 <p className={styles.safety}>Your profile helps screen ingredients, but cannot guarantee a product is allergen-free or safe from cross-contact. Always check the label.</p>
 {!userId&&<p className={styles.note}>Demo mode · Saved for this browser session only.</p>}
 {loadError&&<p role="status" className={styles.note}>Saved allergies couldn’t be loaded. Reload before editing so existing choices aren’t replaced.</p>}
 {error&&<div ref={errorRef} tabIndex={-1} role="alert" className={styles.error}><AlertCircle size={18}/><div><p>{error}</p>{userId&&<Link href="/login">Sign in again</Link>}</div></div>}
 {loadError?<button type="button" className={styles.finish} onClick={()=>window.location.reload()}>Retry loading allergies</button>:<button type="submit" className={styles.finish} disabled={busy}>{busy?<><LoaderCircle className={styles.spinner} size={17}/>Saving profile…</>:error?'Try again':'Finish'}</button>}
 </form>{open&&<CustomDialog custom={draft.custom} onAdd={item=>change({...draft,noKnown:false,custom:[...draft.custom,item]})} onClose={close}/>}</main>;
}
function CustomDialog({custom,onAdd,onClose}:{custom:string[];onAdd:(value:string)=>void;onClose:()=>void}){
 const dialogRef=useRef<HTMLDialogElement>(null);const inputRef=useRef<HTMLInputElement>(null);const [value,setValue]=useState('');const [error,setError]=useState('');
 useEffect(()=>{const dialog=dialogRef.current;dialog?.showModal();inputRef.current?.focus();return()=>{dialog?.close();};},[]);
 function add(){const invalid=customAllergyError(value,custom);setError(invalid);if(invalid){inputRef.current?.focus();return false;}onAdd(normalizeAllergy(value));setValue('');inputRef.current?.focus();return true;}
 return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="custom-title" aria-describedby="custom-help" onClose={onClose}><form onSubmit={e=>{e.preventDefault();add();}} noValidate><header><h2 id="custom-title">Add custom allergies</h2><button type="button" aria-label="Close custom allergy dialog" onClick={()=>dialogRef.current?.close()}><X size={20}/></button></header><p id="custom-help">Add one allergy at a time. You can add up to 20 and remove them on the main screen.</p><label htmlFor="custom-allergy">Allergy name</label><input id="custom-allergy" ref={inputRef} value={value} maxLength={60} onChange={e=>{setValue(e.target.value);setError('');}} placeholder="e.g. Mustard" aria-invalid={Boolean(error)} aria-describedby={error?'custom-error':'custom-help'}/>{error&&<p id="custom-error" role="alert" className={styles.fieldError}>{error}</p>}<p role="status" className={styles.hint}>{custom.length} custom {custom.length===1?'allergy':'allergies'} added</p><button type="submit" className={styles.add}>Add allergy</button><button type="button" className={styles.finish} onClick={()=>{if(!value.trim()||add())dialogRef.current?.close();}}>Done</button></form></dialog>;
}
