'use client';
import {useState,useTransition} from 'react';
import {Package} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {safeProductImage} from '@/lib/home-data';
import styles from './product-detail.module.css';
export function FoodImage({src,name,large=false}:{src:string|null|undefined;name:string;large?:boolean}){const [failed,setFailed]=useState(false);const image=safeProductImage(src);return <div className={large?styles.heroImage:styles.thumbnail}>{image&&!failed?
 // eslint-disable-next-line @next/next/no-img-element
 <img src={image} alt={name} referrerPolicy="no-referrer" loading={large?'eager':'lazy'} onError={()=>setFailed(true)}/>:<div className={styles.imageFallback}><Package size={large?58:30}/><span>Image unavailable</span></div>}</div>;}
export function RefreshProduct({label='Retry product'}:{label?:string}){const router=useRouter();const [pending,start]=useTransition();return <button className={styles.retry} disabled={pending} onClick={()=>start(()=>router.refresh())}>{pending?'Retrying…':label}</button>;}
