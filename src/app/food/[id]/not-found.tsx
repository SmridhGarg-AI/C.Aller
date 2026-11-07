import Link from 'next/link';
import styles from '@/components/product-detail.module.css';
export default function NotFound(){return <main className={styles.panel}><h1>Product not found</h1><p>This product code isn’t available in the configured product database.</p><Link href="/search" className={styles.primary}>Back to search</Link><Link href="/barcode" className={styles.historyLink}>Try scanning a barcode</Link></main>;}
