const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nbxikhiwdzllhgypkfyw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlraGl3ZHpsbGhneXBrZnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1NjEyOSwiZXhwIjoyMTAxOTMyMTI5fQ.KlVdm364FNfKOhTkezd2LH6XTCFpObm_thklXwKVxWc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanName(original) {
  if (!original) return original;
  
  // 1. Remove characters like '+', '-', '.' from the start
  let cleaned = original.replace(/^[\+\-\.]+/g, '');
  
  // 2. Remove leading digits (if someone imported quantities or numbering directly into the name)
  cleaned = cleaned.replace(/^\d+/g, '');
  
  // 3. Trim extra spaces
  cleaned = cleaned.trim();
  
  // 4. Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

async function run() {
  console.log('Fetching inventory...');
  const { data: inventory, error } = await supabase.from('salon_inventory').select('id, name');
  
  if (error) {
    console.error('Error fetching inventory:', error);
    return;
  }
  
  console.log(`Found ${inventory.length} items. Cleaning names...`);
  let updatedCount = 0;
  
  for (const item of inventory) {
    const cleaned = cleanName(item.name);
    
    if (cleaned !== item.name) {
      console.log(`Updating: "${item.name}" -> "${cleaned}"`);
      const { error: updateError } = await supabase
        .from('salon_inventory')
        .update({ name: cleaned })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`Failed to update ${item.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Done! Updated ${updatedCount} product names.`);
}

run();
