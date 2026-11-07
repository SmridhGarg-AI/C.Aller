'use client';
import {useSyncExternalStore} from 'react';
import App from './app';
import {dietDraftKey,parseDietDraft,type DietDraft} from '@/lib/auth/diet-draft';
import {draftKey,parseNameDraft,type NameDraft} from '@/lib/auth/onboarding-draft';
const subscribe=()=>()=>{};
export default function MedicalBridge({initialName,initialDiet,userId}:{initialName:NameDraft;initialDiet:DietDraft;userId:string|null}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);let name=initialName;let diet=initialDiet;
 if(ready){try{name=parseNameDraft(JSON.parse(localStorage.getItem(draftKey(userId))||'null'))||name;diet=parseDietDraft(JSON.parse(localStorage.getItem(dietDraftKey(userId))||'null'))||diet;}catch{/* Fall back to cloud preferences. */}}
 if(!ready)return <main aria-busy="true" style={{minHeight:'100svh',padding:28,background:'#f6f1e8'}}>Loading health preferences…</main>;
 return <App screen="onboarding" initialStep={3} initialName={name.name} initialAge={name.age} initialDiet={diet.selected} initialDietOther={diet.selected.includes('Other')?diet.other:''} initialDietClarification={diet.clarification}/>;
}
