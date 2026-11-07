import {allergenAliases,splitIngredientText,type AllergyProfile} from './allergen-assessment.ts';
export type IngredientFinding={ingredient:string;sourceText:string;kind:'contains'|'may-contain'|'ambiguous'|'none';tag:'Your allergy'|'Contains dairy'|'Potential derivative'|'No identified match'|'Uncertain';matches:{allergen:string;matchedText:string;personal:boolean}[]};
export type IngredientAnalysis={risk:'unsafe'|'caution'|'clear';label:'Not Safe'|'Caution'|'No known conflict found in provided text';summary:string;findings:IngredientFinding[];limitations:string[];method:'deterministic-v1'};
export function analyzeIngredientText(text:string,profile:AllergyProfile,options:{english:boolean;complete:boolean}):IngredientAnalysis{
 const selected=profile.allergies.map(a=>a.trim().toLowerCase());
 const vocabulary={...allergenAliases,milk:[...allergenAliases.milk,'dairy','caseinates','lactalbumin','lactoglobulin']};
 const custom=selected.some(a=>!allergenAliases[a]);
 const markers=/(?:\b(?:may\s+contain(?:\s+traces\s+of)?|traces\s+of|(?:made|manufactured|produced|processed|packed)\s+(?:in\s+a\s+facility|on\s+(?:shared\s+)?equipment)|shared\s+equipment)\b|\bcontains\s*:?|\bingredients\s*:)/gi;
 const chunks:{text:string;precaution:boolean}[]=[];let start=0;let precaution=false;
 for(const match of text.matchAll(markers)){if(match.index!>start)chunks.push({text:text.slice(start,match.index),precaution});precaution=!/^ingredients|^contains/i.test(match[0]);start=match.index!;}
 chunks.push({text:text.slice(start),precaution});
 const findings:IngredientFinding[]=[];
 for(const chunk of chunks){
  // Keep precaution scope until the next explicit statement marker; preserve original wording for review.
  for(const sourceText of splitIngredientText(chunk.text.replace(/\r?\n/g,';'))){
   if(!/\p{L}/u.test(sourceText))continue;
   const ingredient=sourceText.replace(/^ingredients\s*:\s*/i,'').replace(/^[.;\s]+|[.;\s]+$/g,'');if(!ingredient)continue;
   const matches:IngredientFinding['matches']=[];
   const withoutPlantMilk=ingredient.replace(/\b(?:coconut|oat|almond|soy|soya|rice|cashew)\s+(?:milk|cream|yogurt|yoghurt|cheese)\b/gi,m=>m.replace(/milk|cream|yogurt|yoghurt|cheese/i,'')).replace(/\b(?:peanut|almond|cashew|cocoa|shea|sunflower)\s+butter\b/gi,m=>m.replace(/butter/i,'')).replace(/\bcream\s+of\s+tartar\b/gi,'tartar');
   for(const [allergen,terms] of Object.entries({...vocabulary,...Object.fromEntries(selected.filter(a=>!allergenAliases[a]).map(a=>[a,[a]]))})){
    for(const term of terms){const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=new RegExp('\\b'+escaped+'\\b','i').exec(allergen==='milk'?withoutPlantMilk:ingredient);if(match){matches.push({allergen,matchedText:match[0],personal:selected.includes(allergen)});break;}}
   }
   const isNegated=(term:string)=>{
    const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp('\\b(?:no|not\\s+contain|without|free\\s+from)\\s+'+escaped+'\\b|\\b'+escaped+'[- ]free\\b','i').test(ingredient);
   };
   const negated=matches.some(m=>isNegated(m.matchedText))||(!matches.length&&/\b(?:no|without|free\s+from)\b|[- ]free\b/i.test(ingredient));
   const derivative=/\b(?:lecithin|e\s*-?\s*322|e\s*-?\s*471|mono[- ]?\s*(?:and|&)\s*di(?:glycerides)?|modified\s+(?:food\s+)?starch|natural\s+flavou?r(?:s|ings)?|vegetable\s+protein|albumin)\b/i.test(ingredient);
   const uncertainty=/\b(?:unknown|unreadable|incomplete|flavou?r(?:s|ings)?|spices|seasoning)\b|\.{3}|…/.test(ingredient.toLowerCase());
   const personal=matches.some(m=>m.personal&&!isNegated(m.matchedText));
   const kind=chunk.precaution?'may-contain':personal?'contains':negated||derivative||uncertainty?'ambiguous':'none';
   const tag:IngredientFinding['tag']=chunk.precaution?'Uncertain':personal?'Your allergy':negated?'Uncertain':matches.some(m=>m.allergen==='milk')?'Contains dairy':derivative?'Potential derivative':uncertainty?'Uncertain':'No identified match';
   findings.push({ingredient,sourceText,kind,tag,matches});
  }
 }
 const limitations=['Screening of provided text only. This cannot guarantee absence of allergens or cross-contact.','Matches use a limited English ingredient dictionary; no AI inference or ingredient normalization was used.'];
 if(!options.english)limitations.push('English wording has not been confirmed; other languages cannot be screened reliably.');
 if(!options.complete)limitations.push('The full ingredient and allergen statements have not been confirmed.');
 if(custom)limitations.push('Custom allergies are checked literally; their derivatives may be missed.');
 if(!selected.length&&!profile.noKnown)limitations.push('No allergy profile has been confirmed.');
 const unsafe=findings.some(f=>f.kind==='contains');
 const onlyStatements=/^\s*(?:contains\b|may\s+contain\b|traces\s+of\b|(?:made|manufactured|produced)\b)/i.test(text);
 if(onlyStatements)limitations.push('Only an allergen or precautionary statement was supplied; the ingredient list may be missing.');
 const caution=onlyStatements||findings.some(f=>f.kind==='ambiguous'||f.kind==='may-contain')||!options.english||!options.complete||custom||!findings.length||(!selected.length&&!profile.noKnown);
 const risk=unsafe?'unsafe':caution?'caution':'clear';
 return {risk,label:risk==='unsafe'?'Not Safe':risk==='caution'?'Caution':'No known conflict found in provided text',summary:unsafe?'Identified ingredient matches your saved allergy profile.':caution?'Uncertain wording, precautionary statements or missing information need verification.':'No match to your saved allergies was identified in this text. This is not a safety guarantee.',findings,limitations,method:'deterministic-v1'};
}



