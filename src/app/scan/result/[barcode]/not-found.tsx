import Link from 'next/link';
import styles from '@/components/product-detail.module.css';
export default function InvalidBarcode(){return <main className={styles.panel}><h1>Invalid retail barcode</h1><p>The barcode must include a valid retail check digit.</p><Link href="/scan/barcode" className={styles.primary}>Return to scanner</Link></main>;}
