
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bgklrflfrvodlqllbxrk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna2xyZmxmcnZvZGxxbGxieHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDMxNzIsImV4cCI6MjA5MjE3OTE3Mn0.pJofBTf180jUQm3rNZljd7OuStNQSBYWzrvQ9PXMPJg'
);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // Or some other way
  if (error) {
     const { data: list, error: err2 } = await supabase.from('tables').select('*').limit(1);
     if (err2) console.log("Neither resto-tables nor tables found.");
     else console.log("Found tables:", list);
  } else {
    console.log("Success:", data);
  }
}

check();
