import HomeNavigation from '@/components/home-navigation';
import styles from '@/components/history-screen.module.css';
export default function Loading(){return <div className={styles.workspace}><main className={styles.screen} aria-busy="true"><h1 className={styles.loadingTitle}>Scan History</h1><p role="status">Loading your saved checks…</p>{Array.from({length:6},(_,i)=><div key={i} className={styles.skeleton} aria-hidden="true"/>)}<HomeNavigation active="history"/></main></div>;}
