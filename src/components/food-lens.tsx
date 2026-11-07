'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Camera,ImagePlus,LoaderCircle,RefreshCw} from 'lucide-react';
import {captureLensPhoto,prepareLensPhoto} from '@/lib/food-lens-image';
import {parseLensResult,PHOTO_WARNING,type LensResult} from '@/lib/food-lens';
import './food-lens.css';
export default function FoodLens({configured=true}:{configured?:boolean}){
 const video=useRef<HTMLVideoElement>(null),input=useRef<HTMLInputElement>(null),stream=useRef<MediaStream|null>(null),generation=useRef(0),alive=useRef(false),abort=useRef<AbortController|null>(null);
 const previewUrl=useRef('');
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[photo,setPhoto]=useState<Blob|null>(null),[url,setUrl]=useState(''),[result,setResult]=useState<LensResult|null>(null),[confirmed,setConfirmed]=useState('');
 const stop=useCallback(()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setReady(false);},[]);
 useEffect(()=>{alive.current=true;const pause=()=>{if(document.hidden){stop();setBusy('');}};document.addEventListener('visibilitychange',pause);window.addEventListener('pagehide',stop);return()=>{alive.current=false;stop();abort.current?.abort();document.removeEventListener('visibilitychange',pause);window.removeEventListener('pagehide',stop);};},[stop]);
 useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);
 function updatePhoto(next:Blob|null){if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=next?URL.createObjectURL(next):'';setUrl(previewUrl.current);setPhoto(next);}
 async function start(){
  stop();updatePhoto(null);setResult(null);setConfirmed('');setError('');setBusy('Starting camera…');const version=generation.current;
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Camera needs HTTPS or localhost and a supported browser. Choose a photo from your gallery instead.');
   let next:MediaStream;
   try{next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200}}});}
   catch(e){if(e instanceof DOMException&&e.name==='OverconstrainedError')next=await navigator.mediaDevices.getUserMedia({audio:false,video:true});else throw e;}
   if(!alive.current||version!==generation.current){next.getTracks().forEach(t=>t.stop());return;}
   stream.current=next;if(video.current){video.current.srcObject=next;await video.current.play();}setReady(true);
  }catch(e){stop();if(alive.current)setError(e instanceof DOMException?e.name==='NotAllowedError'?'Camera permission was denied. Allow it in browser settings and retry, or choose from gallery.':e.name==='NotFoundError'?'No camera found. Choose from gallery instead.':'Camera is unavailable or busy. Close other camera apps and retry, or choose from gallery.':e instanceof Error?e.message:'Camera unavailable.');}
  finally{if(alive.current)setBusy('');}
 }
 async function prepare(file?:File){
  if(busy)return;setError('');setBusy('Preparing photo…');setResult(null);setConfirmed('');
  try{const next=file?await prepareLensPhoto(file):video.current?await captureLensPhoto(video.current):null;if(next&&alive.current){stop();updatePhoto(next);}}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not prepare photo.');}
  finally{if(alive.current)setBusy('');}
 }
 async function analyse(){
  if(!photo||busy)return;setError('');setBusy('Identifying possible foods…');abort.current=new AbortController();
  const timeout=setTimeout(()=>abort.current?.abort(),45000);
  try{const form=new FormData();form.set('photo',photo,'food.jpg');const response=await fetch('/api/food-lens',{method:'POST',body:form,signal:abort.current.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Photo analysis failed.');if(alive.current)setResult(parseLensResult(data.result));}
  catch(e){if(alive.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Request timed out or was interrupted. Check your connection and retry.');}
  finally{clearTimeout(timeout);if(alive.current)setBusy('');}
 }
 return <main className="lens-screen">{!configured&&<aside role="status" style={{position:"relative",zIndex:5,background:"#FFF8EF",color:"#3A312C",padding:16,borderRadius:14,margin:16}}><strong>Food Lens needs a Gemini API key</strong><p>Add GEMINI_API_KEY to .env.local and restart the app. The same key enables AI chat and label extraction.</p><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Get your Gemini API key</a><p>You can preview photos now; identification needs the key.</p></aside>}
  <header className="lens-header"><Link href="/home" aria-label="Back to home"><ArrowLeft size={22}/></Link><h1>Food Lens</h1><Camera size={19} aria-hidden="true"/></header>
  <div className="lens-view">
   <video ref={video} autoPlay muted playsInline aria-label="Live food camera" hidden={!!photo}/>
   {/* Object URLs are local previews, never remote untrusted image URLs. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   {url&&<img src={url} alt="Your food photo preview"/>}
   {!ready&&!photo&&<div className="lens-placeholder"><Camera size={42}/><p>Bring your food into focus</p><button onClick={start} disabled={!!busy}>Enable camera</button><small>Camera access requires HTTPS or localhost.</small></div>}
  </div>
  <section className="lens-controls" aria-label="Photo controls">
   <p className="lens-instruction">{photo?'Review your food photo':'Take or upload a photo of your food'}</p>
   {busy&&<p role="status" className="lens-status"><LoaderCircle className="spin" size={18}/>{busy}</p>}
   {error&&<div role="alert" className="lens-error">{error}</div>}
   {photo?<div className="lens-actions"><button disabled={!!busy} onClick={start}><RefreshCw size={16}/>Retake</button><button className="lens-analyse" disabled={!!busy} onClick={analyse}>Analyse photo</button></div>:<div className="lens-shutter-row"><button className="lens-shutter" disabled={!!busy} onClick={()=>ready?prepare():start()} aria-label={ready?'Capture food photo':'Start food camera'}><span/></button><button className="lens-gallery-icon" disabled={!!busy} aria-label="Upload food photo from gallery" onClick={()=>input.current?.click()}><ImagePlus size={23}/></button></div>}
   <div className="lens-or"><span/>or<span/></div><button className="lens-gallery" disabled={!!busy} onClick={()=>input.current?.click()}>Choose from gallery</button>
   <input hidden ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose food photo" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file){stop();void prepare(file);}}}/>
   <p className="lens-disclosure">JPG, PNG or WebP · up to 15 MB. Photos are resized on your device. Analyse sends the photo to Google Gemini for identification; it is not saved to your profile.</p>
   <p className="lens-warning">{PHOTO_WARNING}</p>
   {result&&<section className="lens-results" aria-live="polite"><h2>Possible food identities</h2><p>These are uncertain suggestions. Confirm an identity if it looks right.</p>{!result.identities.length&&<p>No food could be identified. Try a clearer photo or check an ingredient label.</p>}<div className="lens-identities">{result.identities.map(name=><button key={name} aria-pressed={confirmed===name} onClick={()=>setConfirmed(name)}>{name}</button>)}</div>{confirmed&&<p>You confirmed: {confirmed}. Ingredients remain unverified.</p>}<h2>Possible ingredients · unverified</h2><p>{result.ingredientSuggestions.join(', ')||'No ingredient suggestions available.'}</p><p>Check the complete ingredient label or ask the person who prepared the food before any allergy screening.</p><Link href="/ingredient-check">Check an ingredient label →</Link><Link href="/scan/barcode">Scan a packaged product →</Link></section>}
  </section>
 </main>;
}

