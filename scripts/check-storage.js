const { createClient } = require('C:/Users/ashuc/OneDrive/Desktop/Codxa Agency/node_modules/@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );

  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Existing Supabase Storage Buckets:', buckets.map(b => ({ name: b.name, public: b.public, id: b.id })));
    const exists = buckets.some(b => b.name === 'id-card-photos');
    if (!exists) {
      const { data: createRes, error: createErr } = await supabase.storage.createBucket('id-card-photos', {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png']
      });
      if (createErr) {
        console.error('Bucket creation error:', createErr);
      } else {
        console.log('Successfully created private bucket id-card-photos:', createRes);
      }
    } else {
      console.log('Bucket id-card-photos already exists!');
    }
  }
}

main().catch(console.error);
