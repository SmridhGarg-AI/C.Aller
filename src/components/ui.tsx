'use client';
import Link from 'next/link';
import { ArrowLeft, Home, Search, ScanLine, History, UserRound, LoaderCircle, AlertCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
export function Button({className='', ...props}: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`button ${className}`} {...props}/>; }
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props}/>; }
export function Card({children, className=''}: {children: React.ReactNode; className?: string}) { return <div className={`card ${className}`}>{children}</div>; }
export function Badge({children}: {children: React.ReactNode}) { return <span className="badge">{children}</span>; }
export function Header({title}: {title: string}) { return <header className="page-header"><Link href="/home" aria-label="Back to home"><ArrowLeft size={20}/></Link><strong>{title}</strong><span className="tiny-leaf">âœ³</span></header>; }
export function Loader({label='Loading…'}: {label?:string}) { return <p className="notice"><LoaderCircle className="spin" size={18}/>{label}</p>; }
export function ErrorMessage({message}: {message:string}) { return <p role="alert" className="notice error"><AlertCircle size={18}/>{message}</p>; }
export function BottomNav({active}: {active:string}) { return <nav className="bottom-nav" aria-label="Main navigation">{[['home',Home,'Home'],['search',Search,'Search'],['barcode',ScanLine,'Scan'],['history',History,'History'],['profile',UserRound,'Profile']].map(([path,Icon,label]) => { const I = Icon as typeof Home; return <Link key={String(path)} href={path==="barcode"?"/scan/barcode":`/${path}`} className={`${active===path?'active':''} ${path==='barcode'?'scan-nav':''}`}><I size={21}/><span>{String(label)}</span></Link>; })}</nav>; }
