'use client';
import {useSyncExternalStore} from 'react';
import App from './app';
import {dietDraftKey,parseDietDraft,type DietDraft} from '@/lib/auth/diet-draft';
import {draftKey,parseNameDraft,type NameDraft} from '@/lib/auth/onboarding-draft';
import {profileMedical,type MedicalDraft} from '@/lib/auth/medical-draft';
const subscribe=()=>()=>{};
export default function AllergiesBridge({initialName,initialDiet,initialMedical,initialAllergies,userId}:{initialName:NameDraft;initialDiet:DietDraft;initialMedical:MedicalDraft;initialAllergies:string[];userId:string|null}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);let name=initialName;let diet=initialDiet;let medical=initialMedical;
 if(ready&&!userId){try{name=parseNameDraft(JSON.parse(localStorage.getItem(draftKey(null))||'null'))||name;diet=parseDietDraft(JSON.parse(localStorage.getItem(dietDraftKey(null))||'null'))||diet;const stored=JSON.parse(sessionStorage.getItem('aller-medical-demo')||'null');if(stored)medical=profileMedical({medical:stored.selected,medical_other:stored.other});}catch{/* Demo storage unavailable; defaults remain optional. */}}
 if(!ready)return <main aria-busy="true" style={{minHeight:'100svh',padding:28,background:'#f6f1e8'}}>Loading allergy preferences…</main>;
 return <App screen="onboarding" initialStep={4} initialName={name.name} initialAge={name.age} initialDiet={diet.selected} initialDietOther={diet.selected.includes('Other')?diet.other:''} initialDietClarification={diet.clarification} initialMedical={medical.selected} initialMedicalOther={medical.selected.includes('Other')?medical.other:''} initialAllergies={initialAllergies}/>;
}
