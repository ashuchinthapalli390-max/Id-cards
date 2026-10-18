const fs = require('fs');
const { Resend } = require('resend');

// Simple env loader
const envContent = fs.readFileSync('.env', 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function main() {
  console.log('Testing Resend connection...');
  console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const domains = await resend.domains.list();
    console.log('Resend Domains successfully fetched:', domains.data);
  } catch (err) {
    console.error('Resend domain check error:', err);
  }
}

main().catch(console.error);
