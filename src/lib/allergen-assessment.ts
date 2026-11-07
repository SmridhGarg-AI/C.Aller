export type AllergyProfile={allergies:string[];noKnown:boolean};
export type AssessmentInput={ingredients:string;allergens:string[];traces:string[];complete:boolean;english:boolean};
export type Assessment={risk:'safe'|'caution'|'unsafe'|'unknown';label:'Safe'|'Caution'|'Not Safe'|'Needs verification';reasons:string[];evidence:AllergenEvidence[]};
export const allergenAliases:Record<string,string[]>={milk:['milk','buttermilk','whey','casein','caseinate','butter','cream','cheese','yogurt','yoghurt','ghee','lactose'],eggs:['egg','eggs','albumen','ovalbumin'],peanuts:['peanut','peanuts','groundnut','groundnuts'],'tree nuts':['nuts','almond','almonds','walnut','walnuts','cashew','cashews','pistachio','pistachios','hazelnut','hazelnuts','pecan','pecans','brazil nut','macadamia','tree nuts'],fish:['fish','salmon','tuna','cod','anchovy','anchovies','haddock','pollock','halibut','trout','tilapia','sardine','sardines','mackerel','hake','whitefish'],shellfish:['shellfish','shrimp','prawn','prawns','crab','lobster','crustacean','crustaceans','mollusc','molluscs','mussel','oyster','scallop','scallops','clam','clams','mussels','oysters','squid','octopus','cuttlefish','scampi','crawfish','crayfish'],wheat:['wheat','semolina','durum','spelt','bulgur','farina','couscous'],soy:['soy','soya','soybean','soybeans','tofu','edamame'],sesame:['sesame','tahini']};
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function matches(text:string,terms:string[]){return terms.some(term=>new RegExp('\\b'+escape(term)+'\\b','i').test(text));}
function result(risk:Assessment['risk'],reasons:string[],evidence:AllergenEvidence[]=[]):Assessment{return {risk,evidence,label:{safe:'Safe',caution:'Caution',unsafe:'Not Safe',unknown:'Needs verification'}[risk] as Assessment['label'],reasons};}
export function assessmentSections(text:string){
 const markers=/\b(?:may\s+contain(?:\s+traces\s+of)?|traces\s+of|(?:made|manufactured|produced|processed|packed)\s+(?:in\s+a\s+facility|on\s+(?:shared\s+)?equipment)|shared\s+equipment|contains\s*:|contains\b|ingredients\s*:)/gi;
 const contains:string[]=[];const precaution:string[]=[];let start=0;let warning=false;
 for(const match of text.matchAll(markers)){const fragment=text.slice(start,match.index);if(fragment.trim())(warning?precaution:contains).push(fragment);warning=!/^(?:contains|ingredients)/i.test(match[0]);start=match.index!;}
 if(text.slice(start).trim())(warning?precaution:contains).push(text.slice(start));return {contains,precaution};
}
export function assessAllergens(food:AssessmentInput,profile:AllergyProfile|null):Assessment{
 if(!profile||(!profile.allergies.length&&!profile.noKnown))return result('unknown',['Add or confirm your allergy profile to enable personal screening.']);
 const sections=assessmentSections(food.ingredients);const precaution=[...food.traces,...sections.precaution].join(' ');
 const declared=food.allergens.map(x=>x.replace(/^[a-z]{2}:/,'').replace(/-/g,' ')).join(' ');
 const hits:string[]=[];const warnings:string[]=[];const evidence:AllergenEvidence[]=[];let unsupported=false;let ambiguous=false;
 for(const allergy of profile.allergies){const key=allergy.trim().toLowerCase();const terms=allergenAliases[key]||[key];if(!allergenAliases[key])unsupported=true;
  if(matches(declared,[key,...terms])){hits.push(allergy);evidence.push({allergy,kind:'contains',source:'Open Food Facts declared allergens',detail:food.allergens.filter(x=>matches(x.replace(/-/g,' '),[key,...terms])).join(', ')||declared});continue;}
  if(matches(precaution,terms)){warnings.push(allergy);evidence.push({allergy,kind:'may-contain',source:'Open Food Facts trace warning / ingredient statement',detail:precaution});}
  if(food.english)for(const section of sections.contains)for(const clause of splitIngredientText(section)){
   const scoped=key==='milk'?clause.replace(/\b(?:coconut|oat|almond|soy|soya|rice|cashew)\s+(?:milk|cream|yogurt|yoghurt|cheese)\b/gi,m=>m.replace(/milk|cream|yogurt|yoghurt|cheese/i,'')).replace(/\b(?:peanut|almond|cashew|cocoa|shea|sunflower)\s+butter\b/gi,m=>m.replace(/butter/i,'')).replace(/\bcream\s+of\s+tartar\b/gi,'tartar'):clause;
   if(key==='milk'&&!matches(scoped,terms)&&matches(clause,terms)){ambiguous=true;evidence.push({allergy,kind:'unknown',source:'Open Food Facts ingredient list',detail:'Plant-source wording needs label verification: '+clause});continue;}
   const found=terms.filter(term=>matches(scoped,[term]));if(!found.length)continue;
   const negated=(term:string)=>new RegExp('\\b(?:no|without|free from|not contain)\\s+'+escape(term)+'\\b|\\b'+escape(term)+'[ -]free\\b','i').test(scoped);
   const veganDairyClaim=key==='milk'&&/\b(?:vegan|plant.based)\b/i.test(scoped)&&!matches(scoped,['whey','casein','caseinate','milk']);
   if(found.every(negated)||veganDairyClaim){ambiguous=true;evidence.push({allergy,kind:'unknown',source:'Open Food Facts ingredient list',detail:'Ambiguous wording: '+clause});}
   else{hits.push(allergy);evidence.push({allergy,kind:'contains',source:'Open Food Facts ingredient list',detail:clause});}
  }
 }
 if(hits.length)return result('unsafe',[`Ingredient or declared allergen matches: ${[...new Set(hits)].join(', ')}.`],evidence);
 if(warnings.length)return result('caution',[`Possible traces or cross-contact warning: ${[...new Set(warnings)].join(', ')}.`],evidence);
 if(ambiguous)return result('caution',['Ingredient wording is ambiguous. Verify the original label before choosing this food.'],evidence);
 if(!food.ingredients.trim()||/^(ingredients (unavailable|unknown)|unknown|n\/a)$/i.test(food.ingredients.trim()))return result('unknown',['Documented ingredients are missing. Check the package label.']);
 if(!food.english||!food.complete||unsupported)return result('unknown',['Ingredient coverage, language, or a custom allergy cannot be screened reliably. Verify the label.']);
 if(food.traces.length||sections.precaution.length)return result('caution',['A precautionary statement is present. Review the full label and cross-contact information.']);
 return result('safe',['No match to your selected allergies was found in the documented ingredients. Screening only; this is not an allergen-free or cross-contact guarantee.']);
}
export type AllergenEvidence={allergy:string;kind:'contains'|'may-contain'|'unknown';source:string;detail:string};
export function splitIngredientText(text:string){const parts:string[]=[];let depth=0;let start=0;for(let i=0;i<text.length;i++){if('(['.includes(text[i]))depth++;if(')]'.includes(text[i]))depth=Math.max(0,depth-1);if(depth===0&&',;'.includes(text[i])){const part=text.slice(start,i).trim();if(part)parts.push(part);start=i+1;}}const last=text.slice(start).trim();if(last)parts.push(last);return parts;}

