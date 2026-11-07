'use client';
import Link from 'next/link';
import {useState} from 'react';
import {Package,ChevronRight} from 'lucide-react';
import {riskPresentation,scanTimestamp,type SavedScan} from '@/lib/home-data';
import styles from './home-screen.module.css';
function Thumbnail({image,name}:{image:string|null;name:string}){const [failed,setFailed]=useState(false);return <div className={styles.thumbnail}>{image&&!failed?/* Product records are restricted to Open Food Facts hosts. */
 // eslint-disable-next-line @next/next/no-img-element
 <img src={image} alt={name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Package size={25} strokeWidth={1.4} aria-label="Product image unavailable"/>}</div>;}
export default function ScanList({scans,now}:{scans:SavedScan[];now:number}){return <ul className={styles.scanList}>{scans.map(scan=>{const risk=riskPresentation(scan.product.risk);return <li key={scan.id}><Link className={styles.scanRow} href={'/history?scan='+encodeURIComponent(scan.id)}><Thumbnail image={scan.product.image} name={scan.product.name}/><div className={styles.scanText}><strong>{scan.product.name}</strong><time dateTime={scan.createdAt} title={new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(scan.createdAt))}>{scanTimestamp(scan.createdAt,now)}</time></div><span className={`${styles.risk} ${styles[risk.tone]}`}>{scan.product.assessmentLabel==='No known conflict found in provided text'?'No match in text':scan.product.assessmentLabel||risk.label}</span><ChevronRight size={13} className={styles.rowArrow}/></Link></li>;})}</ul>;}

