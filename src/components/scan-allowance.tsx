'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {parseEntitlement} from '@/lib/entitlements';
export default function ScanAllowance(){const [label,setLabel]=useState('Checking scan allowance…');useEffect(()=>{const controller=new AbortController();void fetch('/api/entitlements',{signal:controller.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);const usage=parseEntitlement(data);setLabel(usage.plan==='plus'?'Plus · unlimited barcode scans':`${usage.remaining} of 50 Free scans remaining this UTC calendar month`);}).catch(e=>{if(!controller.signal.aborted)setLabel(e instanceof Error?e.message:'Scan allowance unavailable.');});return()=>controller.abort();},[]);return <p style={{fontSize:11,color:'#fff8ef',padding:'8px 12px',background:'#35271fcc',borderRadius:12}}>{label} <Link href="/plus" style={{textDecoration:'underline'}}>View plan</Link></p>;}
