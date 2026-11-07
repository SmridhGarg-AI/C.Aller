import styles from '@/components/product-detail.module.css';
export default function Loading(){return <main className={styles.panel} aria-busy="true"><p role="status" className={styles.source}>Looking up your barcode and checking your allergy profile…</p><div className={styles.skeleton}/><div className={styles.skeleton} style={{height:110}}/></main>;}
