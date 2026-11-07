import {createHash} from 'node:crypto';
import {analyzeIngredientText} from './ingredient-analysis.ts';
import {readIngredientDraft,reviewedIngredientDraft} from './ingredient-draft.ts';
import type {AllergyProfile} from './allergen-assessment';
type Dependencies={loadProfile:()=>Promise<{userId:string;profile:AllergyProfile}|null>;save:(row:{id:string;user_id:string;product:Record<string,unknown>})=>Promise<void>};
export function createIngredientAnalysisHandler(deps:Dependencies){return async(request:Request)=>{
 const reply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Request origin is not allowed.'},403);
 try{
  const reader=request.body?.getReader();if(!reader)return reply({error:'Reviewed ingredient text is required.'},400);
  const chunks:Uint8Array[]=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>50000){await reader.cancel();return reply({error:'Ingredient text is too large.'},413);}chunks.push(value);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply({error:'Invalid ingredient request.'},400);}
  const draft=readIngredientDraft(JSON.stringify(body?.draft));
  if(!draft||!draft.reviewed||typeof body.english!=='boolean'||typeof body.complete!=='boolean'||!['analyze','save'].includes(body.action))return reply({error:'Review your ingredient text again before analysis.'},400);
  try{reviewedIngredientDraft(draft.text,draft.source,draft.reviewed,draft.updatedAt);}catch{return reply({error:'Correct unreadable or invalid source text first.'},400);}
  const account=await deps.loadProfile();if(!account)return reply({error:'Sign in and complete your allergy profile to get a personalized assessment.'},401);
  const analysis=analyzeIngredientText(draft.text,account.profile,{english:body.english,complete:body.complete});
  let savedId:string|undefined;
  if(body.action==='save'){
   const hash=createHash('sha256').update(JSON.stringify([account.userId,account.profile,draft,body.english,body.complete,analysis.method])).digest('hex');
   savedId=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
   await deps.save({id:savedId,user_id:account.userId,product:{code:'',name:'Ingredient label check',brand:draft.source==='label'?'Reviewed label photo':'Manual ingredient text',ingredients:draft.text,allergens:analysis.findings.flatMap(f=>f.matches.filter(m=>m.personal).map(m=>m.allergen)).filter((v,i,a)=>a.indexOf(v)===i).join(', '),image:null,risk:analysis.risk==='clear'?'unknown':analysis.risk,source:'User-reviewed ingredient text',kind:'ingredient-analysis',method:draft.source==='label'?'image':'ingredients',assessment:analysis,assessed_at:new Date().toISOString()}});
  }
  return reply({analysis,savedId});
 }catch{return reply({error:'Your profile or result could not be loaded or saved. Check your connection and retry.'},503);}
};}


