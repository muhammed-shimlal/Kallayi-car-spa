import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('service_packages')
    .select('*, tiered_prices:service_package_prices(*)');
  console.log('Join Error:', error ? error.message : null);
  console.log('Packages Count:', data?.length);
  if (data) {
    data.forEach(p => {
      console.log(`Package #${p.id} "${p.name}" (Base: ₹${p.price}):`);
      console.log('  Tiers in DB:', p.tiered_prices);
    });
  }
}

check();
