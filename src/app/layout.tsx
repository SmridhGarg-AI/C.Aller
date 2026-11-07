import type { Metadata } from 'next';
import './globals.css';
import {AppStateProvider} from '@/components/app-state';
export const metadata: Metadata = { title: 'Aller Matrix — Food freedom, with confidence', description: 'Understand your food. Explore ingredients and your personal food preferences.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AppStateProvider>{children}</AppStateProvider></body></html>; }
