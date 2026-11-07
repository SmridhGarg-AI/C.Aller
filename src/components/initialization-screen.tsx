'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AlertCircle,RotateCcw} from 'lucide-react';
import {useApplicationState} from './app-state';
import {InitializationError} from '@/lib/initialization';
import styles from './initialization-screen.module.css';
export default function InitializationScreen(){
 const router=useRouter();const {initialize,progress}=useApplicationState();const [attempt,setAttempt]=useState(0);const [error,setError]=useState<{message:string;code:string}|null>(null);const errorRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{let active=true;void initialize().then(()=>{if(active)router.replace('/home');}).catch(error=>{if(active)setError({message:error instanceof InitializationError?error.message:'Something interrupted setup. Please try again.',code:error instanceof InitializationError?error.code:'network'});});return()=>{active=false;};},[initialize,attempt,router]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 return <main className={styles.screen}><section className={styles.panel} aria-labelledby="setup-title" aria-busy={!error}>
 <div className={styles.illustration} role="img" aria-label="A cheerful bowl of noodles and fresh vegetables"/>
 <h1 id="setup-title">Setting things up<br/>for you...</h1><p className={styles.description}>Analysing your preferences and<br/>personalising your experience</p>
 <progress className={`${styles.progress} ${error?styles.paused:''}`} max={3} value={progress.completed} aria-label="Application initialization" aria-valuetext={`${progress.completed} of 3 steps complete. ${progress.label}`}/>
 {!error&&<p className={styles.status} role="status" aria-live="polite">{progress.label}</p>}
 {error&&<div className={styles.error} ref={errorRef} tabIndex={-1} role="alert"><AlertCircle size={19}/><div><p>{error.message}</p><button onClick={()=>{setError(null);setAttempt(value=>value+1);}}><RotateCcw size={15}/>Retry setup</button>{error.code==='session'&&<Link href="/login">Sign in</Link>}{['incomplete','profile'].includes(error.code)&&<Link href="/onboarding/name">Review profile setup</Link>}</div></div>}
 <p className={styles.footer}>This will just take a moment.</p>
 </section></main>;
}
