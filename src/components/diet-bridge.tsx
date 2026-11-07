'use client';
import { useSyncExternalStore } from 'react';
import App from './app';
import {draftKey,parseNameDraft,type NameDraft} from '@/lib/auth/onboarding-draft';
const subscribe=()=>()=>{};
export default function DietBridge({initial,userId}:{initial:NameDraft;userId:string|null}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);let draft=initial;
 if(ready){try{draft=parseNameDraft(JSON.parse(localStorage.getItem(draftKey(userId))||'null'))||initial;}catch{/* Use cloud draft if device storage is unavailable. */}}
 if(!ready)return <main aria-busy="true" style={{minHeight:'100svh',background:'#f6f1e8',padding:28}}>Loading your preferences…</main>;
 return <App screen="onboarding" initialStep={2} initialName={draft.name} initialAge={draft.age}/>;
}
