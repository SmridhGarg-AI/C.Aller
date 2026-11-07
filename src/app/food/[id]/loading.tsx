import styles from '@/components/product-detail.module.css';
export default function Loading(){return <main className={styles.panel} aria-busy="true"><p role="status" className={styles.source}>Loading product and allergy profile…</p><div className={styles.skeleton}/><div className={styles.skeleton} style={{height:100}}/></main>;}
