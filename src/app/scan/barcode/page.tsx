import BarcodeScanner from '@/components/barcode-scanner';
export default async function BarcodePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const query=await searchParams;return <BarcodeScanner initialCode={typeof query.code==='string'?query.code.slice(0,24):''}/>;}
