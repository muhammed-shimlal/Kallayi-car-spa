import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('staff_profiles').select('*').limit(1);
  console.log('staff_profiles cols:', Object.keys(data?.[0] || {}));
  
  const { data: pData } = await supabase.from('payroll_entries').select('*').limit(1);
  console.log('payroll_entries cols:', Object.keys(pData?.[0] || {}));
}

check();
