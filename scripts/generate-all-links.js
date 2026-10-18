const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const BASE_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://id.codxa-agency.online';
const EXPIRY_DAYS = 30; // 30 days valid

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

async function main() {
  console.log('Connecting to database and fetching all registered interns...');

  const interns = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'INTERN' },
        { orgRole: 'INTERN' }
      ]
    },
    include: {
      employmentProfile: true,
      idCardInvitations: {
        where: {
          status: { in: ['ACTIVE', 'SUBMITTED'] }
        },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: [
      { employmentProfile: { employeeId: 'asc' } },
      { username: 'asc' }
    ]
  });

  console.log(`Found ${interns.length} interns in database.`);

  const linkRows = [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  for (let i = 0; i < interns.length; i++) {
    const intern = interns[i];
    const employeeId = intern.employmentProfile?.employeeId || intern.username;
    const department = intern.employmentProfile?.department || intern.department || 'Engineering';
    const fullName = intern.fullName || intern.username;
    const email = intern.email;

    // Generate a fresh 256-bit token
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Invalidate any older invitations
    await prisma.idCardInvitation.updateMany({
      where: { userId: intern.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: now }
    });

    // Create new active invitation in DB
    activeInvitation = await prisma.idCardInvitation.create({
      data: {
        userId: intern.id,
        tokenHash,
        expiresAt,
        status: 'ACTIVE',
        createdBy: 'system_bulk_export'
      }
    });

    const uploadUrl = `${BASE_URL}/upload/${rawToken}`;

    linkRows.push({
      index: i + 1,
      employeeId,
      fullName,
      department,
      email,
      uploadUrl,
      expiresAt: expiresAt.toISOString().split('T')[0]
    });
  }

  // Format text document
  const divider = '='.repeat(90);
  const subDivider = '-'.repeat(90);

  let output = `${divider}\n`;
  output += ` CODEXA AGENCY — OFFICIAL INTERN ID CARD DIRECT UPLOAD LINKS\n`;
  output += ` Portal: ${BASE_URL}\n`;
  output += ` Generated: ${new Date().toUTCString()}\n`;
  output += ` Total Interns: ${linkRows.length}\n`;
  output += ` Instructions: Share each personalized link with the respective intern.\n`;
  output += ` No login or password is required. Clicking the link opens their photo cropper.\n`;
  output += `${divider}\n\n`;

  linkRows.forEach(row => {
    output += `[${row.index.toString().padStart(2, '0')}] ${row.fullName.toUpperCase()}\n`;
    output += `     Intern ID  : ${row.employeeId}\n`;
    output += `     Department : ${row.department}\n`;
    output += `     Email      : ${row.email}\n`;
    output += `     Direct Link: ${row.uploadUrl}\n`;
    output += `     Valid Until: ${row.expiresAt}\n`;
    output += `${subDivider}\n`;
  });

  output += `\n${divider}\n`;
  output += ` END OF DIRECT UPLOAD LINKS (CONFIDENTIAL - DO NOT SHARE PUBLICLY)\n`;
  output += `${divider}\n`;

  const outputPath = path.join(process.cwd(), 'intern_upload_links.txt');
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`\n Successfully generated: ${outputPath}`);
  console.log(` Total active links created: ${linkRows.length}`);
}

main()
  .catch(err => {
    console.error('Error generating links:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
