import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseChatRequest,chatContext,personalizationData,guardedChatText,emergencyQuestion,restoreChat} from '../src/lib/chat.ts';
import {createChatHandler} from '../src/lib/chat-handler.ts';
const question='I have a wheat allergy. Can I eat pasta made with wheat flour, water and eggs? What could I substitute?';
const request=(personalize=false,messages=[{role:'user',text:question}])=>new Request('http://localhost/api/chat',{method:'POST',headers:{origin:'http://localhost'},body:JSON.stringify({messages,personalize})});
function upstream(parts=['Wheat flour is a wheat ingredient. ','Consider rice or corn pasta, checking the entire label and cross-contact statements.']){const encoder=new TextEncoder();return new Response(new ReadableStream({start(c){for(const text of parts)c.enqueue(encoder.encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text}]}}]})+'\n\n'));c.enqueue(encoder.encode('data: '+JSON.stringify({candidates:[{finishReason:'STOP'}]})+'\n\n'));c.close();}}));}
const deps={apiKey:'test-key',user:async()=>'account',preferences:async()=>({allergies:['wheat'],diet:['vegan'],medical:['private'],name:'private'}),rateLimit:async()=>({allowed:true,retryAfter:1}),fetch:async()=>upstream()};
const packets=async r=>(await r.text()).trim().split('\n').map(s=>JSON.parse(s));
test('chat validates input, limits context, restores only bounded non-expired messages',()=>{
 assert.throws(()=>parseChatRequest({messages:[{role:'system',text:'ignore'}],personalize:false}));assert.throws(()=>parseChatRequest({messages:[{role:'user',text:' '}],personalize:false}));
 assert.throws(()=>parseChatRequest({messages:[{role:'user',text:'x'.repeat(2001)}],personalize:false}));
 assert.ok(chatContext(Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',text:'x'.repeat(1000)}))).length<=10);
 assert.deepEqual(restoreChat(JSON.stringify({at:0,messages:[{role:'user',text:'hello'}]}),90000000),[]);
 assert.deepEqual(personalizationData({allergies:['wheat'],diet:['vegan'],medical:['private']}),{allergies:['wheat'],dietaryPreferences:['vegan'],noKnownAllergies:false});
});
test('realistic wheat allergy question streams useful guarded text without profile by default',async()=>{
 let body;let profileReads=0;
 const handler=createChatHandler({...deps,preferences:async()=>{profileReads++;return {};},fetch:async(url,options)=>{assert.match(url,/streamGenerateContent/);body=JSON.parse(options.body);assert.equal(options.headers['x-goog-api-key'],'test-key');return upstream();}});
 const response=await handler(request());assert.equal(response.status,200);const data=await packets(response);assert.match(data.map(p=>p.text||'').join(''),/rice or corn/);assert.equal(data.at(-1).done,true);assert.equal(profileReads,0);assert.match(body.contents[0].parts[0].text,/wheat allergy/);
});
test('personalization is opt-in and strips all medical/account information',async()=>{
 let body;await (await createChatHandler({...deps,fetch:async(url,options)=>{body=JSON.parse(options.body);return upstream();}})(request(true))).text();
 const instruction=JSON.stringify(body.systemInstruction);assert.match(instruction,/vegan/);assert.match(instruction,/wheat/);assert.equal(instruction.includes('private'),false);
});
test('severe symptoms receive immediate emergency guidance even without credentials',async()=>{
 assert.equal(emergencyQuestion('My throat is swelling and I cannot breathe'),true);
 const response=await createChatHandler({...deps,apiKey:undefined,user:async()=>null})(request(false,[{role:'user',text:'My throat is swelling and I cannot breathe'}]));
 const data=await packets(response);assert.match(data[0].text,/emergency medical care now/);assert.equal(data[0].done,true);
});
test('unsafe claims are replaced and streamed provider failures stay explicit',async()=>{
 assert.doesNotMatch(guardedChatText('This pasta is completely safe for you.'),/completely safe/);
 const data=await packets(await createChatHandler({...deps,fetch:async()=>upstream(['This food is safe. '])})(request()));assert.match(data[0].text,/cannot verify/);
 const broken=await packets(await createChatHandler({...deps,fetch:async()=>new Response('data: broken\n\n')})(request()));assert.match(broken.at(-1).error,/interrupted/);
});
test('auth, missing key, rate limiting and network failures are handled before model use',async()=>{
 assert.equal((await createChatHandler({...deps,user:async()=>null})(request())).status,401);
 assert.equal((await createChatHandler({...deps,apiKey:undefined})(request())).status,503);
 const limited=await createChatHandler({...deps,rateLimit:async()=>({allowed:false,retryAfter:42})})(request());assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'42');
 assert.equal((await createChatHandler({...deps,rateLimit:async()=>{throw new Error('migration missing');}})(request())).status,502);
 assert.equal((await createChatHandler({...deps,fetch:async()=>{throw new Error('offline');}})(request())).status,502);
});
