import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');
const key = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1]?.trim()?.replace(/['"]/g, '');

const supabase = createClient(url, key);

async function inspect() {
  const { data: custs } = await supabase.from('customers').select('id, name, phone_number, user_id');
  console.log('CUSTOMERS COUNT:', custs?.length);
  console.log('CUSTOMERS:', custs);

  const userId = 'd0000000-0000-0000-0000-000000000001';
  const res = await supabase.auth.admin.getUserById(userId);
  console.log('getUserById:', res);

  const { data: staffRec } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  console.log('staffRec for admin:', staffRec);

  const { data: bookings, error: bErr } = await supabase.from('bookings').select('*').limit(3);
  console.log('BOOKINGS ERROR:', bErr);
  console.log('BOOKINGS COUNT:', bookings?.length);
  if (bookings && bookings.length > 0) {
    console.log('BOOKINGS SAMPLE:', bookings);
  }

  for (const c of custs) {
    if (c.user_id) {
      const { data: u, error: uErr } = await supabase.auth.admin.getUserById(c.user_id);
      console.log(`Cust ${c.name} (${c.phone_number}) -> Auth: phone=${u?.user?.phone}, email=${u?.user?.email}, meta=${JSON.stringify(u?.user?.user_metadata)}`);
    }
  }
}

inspect();
