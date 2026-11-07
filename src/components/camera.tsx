'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Button, ErrorMessage } from './ui';
export default function Camera({onCode}: {onCode:(code:string)=>void}) {
 const video = useRef<HTMLVideoElement>(null); const [error,setError]=useState(''); const [running,setRunning]=useState(false); const control=useRef<IScannerControls|null>(null);
 useEffect(()=>()=>{control.current?.stop();},[]);
 async function start(){setError(''); try { const reader=new BrowserMultiFormatReader(); control.current=await reader.decodeFromVideoDevice(undefined,video.current!,result=>{if(result){control.current?.stop();setRunning(false);onCode(result.getText());}}); setRunning(true); }catch{setError('Camera unavailable. Allow camera access over HTTPS or localhost, or enter a barcode below.');}}
 return <><div className="viewfinder"><video ref={video} playsInline muted/><div className="scan-frame"/><span>Align the barcode within the frame</span></div>{error&&<ErrorMessage message={error}/>}<Button onClick={()=>{if(running){control.current?.stop();setRunning(false);}else void start();}}>{running?'Stop camera':'Open camera'}</Button></>;
}
