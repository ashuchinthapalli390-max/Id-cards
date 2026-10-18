const { Resend } = require('C:/Users/ashuc/OneDrive/Desktop/Codxa Agency/node_modules/resend');

async function main() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const domains = await resend.domains.list();
    console.log('Resend Domains:', domains);
  } catch (err) {
    console.error('Resend domain check error:', err);
  }
}

main().catch(console.error);
