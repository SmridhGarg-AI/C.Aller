'use client';
import Link from 'next/link';
import {useLanguage} from './language-settings';
import {Home,Search,ScanLine,History,UserRound} from 'lucide-react';
import styles from './home-screen.module.css';
const items=[{path:'home',label:'Home',Icon:Home},{path:'search',label:'Search',Icon:Search},{path:'barcode',label:'Scan barcode',Icon:ScanLine},{path:'history',label:'History',Icon:History},{path:'profile',label:'Profile',Icon:UserRound}];
export default function HomeNavigation({active}:{active:string}){const {t}=useLanguage();return <nav className={styles.navigation} aria-label="Main navigation">{items.map(({path,label,Icon})=><Link key={path} href={path==='barcode'?'/scan/barcode':'/'+path} aria-label={label} aria-current={active===path?'page':undefined} className={`${active===path?styles.active:''} ${path==='barcode'?styles.scanAction:''}`}><Icon size={22} strokeWidth={1.7}/><span>{t(path==='barcode'?'Scan':label)}</span></Link>)}</nav>;}
