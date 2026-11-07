'use client';
import Link from 'next/link';
import {DemoPlusBadge} from './demo-checkout';
import {useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Bell,Search,ScanBarcode,Camera,ListChecks,MessagesSquare,PackageSearch,AlertCircle,X} from 'lucide-react';
import {searchDestination,type SavedScan} from '@/lib/home-data';
import HomeNavigation from './home-navigation';
import ScanList from './scan-list';
import styles from './home-screen.module.css';
const features=[{route:'/scan/barcode',title:'Scan Barcode',description:<>Check packaged<br/>foods</>,Icon:ScanBarcode,tone:'barcode'},{route:'/food-lens',title:'Food Lens',description:<>Identify food<br/>from a photo</>,Icon:Camera,tone:'lens'},{route:'/ingredients',title:'Ingredient Check',description:<>Scan or type<br/>ingredients</>,Icon:ListChecks,tone:'ingredients'},{route:'/chat',title:'Ask Aller Matrix',description:<>Get answers &amp;<br/>support</>,Icon:MessagesSquare,tone:'chat'}];
export default function HomeScreen({name,scans,demo,profileError,historyError,now}:{name:string;scans:SavedScan[];demo:boolean;profileError:boolean;historyError:boolean;now:number}){
 const router=useRouter();const [query,setQuery]=useState('');const [pending,refresh]=useTransition();const dialog=useRef<HTMLDialogElement>(null);
 const firstName=name.trim().split(/\s+/)[0];
 return <div className={styles.workspace}><aside className={styles.desktopAside}><Link className={styles.wordmark} href="/home">Aller <span>Matrix</span></Link><p>Understand your food.<br/>Live your life.</p><span className={styles.desktopCaption}>YOUR EVERYDAY FOOD COMPANION</span></aside><main className={styles.panel}>
 <header className={styles.greeting}><div><h1>Hello, {firstName||'food explorer'} <span role="img" aria-label="waving hand">👋</span></h1><p>Check your food, explore options,<br/>and eat with confidence.</p></div><button className={styles.notifications} type="button" aria-label="Open notifications and recent activity" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><Bell size={21} strokeWidth={1.6}/></button></header>
 {demo&&<p className={styles.demo}>Demo mode · Sign in after configuring Supabase to sync your profile and scans.</p>}
 {profileError&&<div role="alert" className={styles.error}><AlertCircle size={17}/><div><p>Your profile couldn’t be loaded.</p><button disabled={pending} onClick={()=>refresh(()=>router.refresh())}>{pending?'Retrying…':'Retry profile'}</button></div></div>}
 <form action="/search" method="get" className={styles.search} onSubmit={event=>{event.preventDefault();if(query.trim())router.push(searchDestination(query));}}><button type="submit" aria-label="Search foods" disabled={!query.trim()}><Search size={19}/></button><label className={styles.srOnly} htmlFor="home-search">Search for a food or product</label><input id="home-search" type="search" name="query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for a food or product..." maxLength={100} required/></form>
 <section className={styles.featureGrid} aria-label="Explore food tools">{features.map(({route,title,description,Icon,tone})=><Link key={route} href={route} className={`${styles.feature} ${styles[tone]}`}><span className={styles.featureIcon}><Icon size={32} strokeWidth={1.5}/></span><h2>{title}</h2><p>{description}</p></Link>)}</section>
 <section className={styles.recent} aria-labelledby="recent-heading"><header><h2 id="recent-heading">Recent Scans</h2><Link href="/history">See all</Link></header>{historyError?<div role="alert" className={styles.error}><AlertCircle size={18}/><div><p>We couldn’t load your recent scans.</p><button disabled={pending} onClick={()=>refresh(()=>router.refresh())}>{pending?'Retrying…':'Retry scans'}</button></div></div>:scans.length?<><ScanList scans={scans} now={now}/><p className={styles.safety}>Badges reflect saved screening results, not a guarantee of safety. Always check the package label and cross-contact information.</p></>:<div className={styles.empty}><PackageSearch size={29} strokeWidth={1.4}/><h3>No scans yet</h3><p>{demo?'No sample scans are shown. Your saved scans will appear here when you sign in.':'Your saved food checks will appear here.'}</p><Link href="/scan/barcode">Scan your first product</Link></div>}</section>
 <DemoPlusBadge/><HomeNavigation active="home"/>
 </main><aside className={styles.desktopNote}><p>Food freedom,<br/><em>with confidence.</em></p><span>A little clarity for your everyday choices.</span></aside>
 <dialog ref={dialog} className={styles.dialog} aria-labelledby="activity-heading"><header><h2 id="activity-heading">Recent activity</h2><button type="button" aria-label="Close recent activity" onClick={()=>dialog.current?.close()}><X size={20}/></button></header><p>Live notifications aren’t configured. Review your saved scan activity below.</p>{historyError?<p>Scan activity is unavailable. Retry from Home.</p>:scans.length?<ScanList scans={scans} now={now}/>:<p>No saved scan activity yet.</p>}<Link href="/history" onClick={()=>dialog.current?.close()}>Open scan history</Link></dialog>
 </div>;
}

