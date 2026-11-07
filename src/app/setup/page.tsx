import { readFile } from 'node:fs/promises';
import path from 'node:path';
import DatabaseSetup from '@/components/database-setup';

export default async function SetupPage() {
 const sql=await readFile(path.join(process.cwd(),'supabase/setup.sql'),'utf8');
 const project=process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1];
 return <DatabaseSetup sql={sql} editor={project?`https://supabase.com/dashboard/project/${project}/sql/new`:'https://supabase.com/dashboard'}/>;
}
