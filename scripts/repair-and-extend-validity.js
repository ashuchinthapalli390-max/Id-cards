const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const crypto = require('crypto');
const prisma = new PrismaClient();

function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

async function main() {
  console.log('Connecting to database...');

  // Minimum validity date: October 19th, 2026 23:59:59 IST (or UTC: 2026-10-19T18:29:59.999Z)
  // We extend it to November 20th, 2026 to give full generous validity well beyond 19th Oct
  const extendedExpiry = new Date('2026-11-20T23:59:59.999Z');

  // 1. Find all submissions
  const allSubmissions = await prisma.idCardPhotoSubmission.findMany({
    select: { userId: true, status: true }
  });
  const submittedUserIds = new Set(
    allSubmissions.filter(s => s.status !== 'REJECTED').map(s => s.userId)
  );
  console.log(`Found ${submittedUserIds.size} interns with completed photo submissions.`);

  // 2. Fetch all invitations
  const allInvitations = await prisma.idCardInvitation.findMany({
    include: {
      user: {
        include: {
          employmentProfile: true,
          idCardSubmissions: true
        }
      }
    }
  });

  console.log(`Total invitations in DB: ${allInvitations.length}`);

  let reactivatedCount = 0;
  let markedSubmittedCount = 0;
  let validityExtendedCount = 0;

  for (const inv of allInvitations) {
    const hasCompletedSubmission = submittedUserIds.has(inv.userId);

    if (hasCompletedSubmission) {
      if (inv.status !== 'SUBMITTED') {
        await prisma.idCardInvitation.update({
          where: { id: inv.id },
          data: { status: 'SUBMITTED', revokedAt: null }
        });
        markedSubmittedCount++;
        console.log(`[SUBMITTED] Intern ${inv.user?.fullName} (${inv.user?.employmentProfile?.employeeId}) marked as SUBMITTED (was ${inv.status})`);
      }
    } else {
      // Intern hasn't submitted yet. Ensure status is ACTIVE and expiresAt is extended!
      const needsReactivate = inv.status !== 'ACTIVE';
      const needsExtend = inv.expiresAt < extendedExpiry;

      if (needsReactivate || needsExtend) {
        await prisma.idCardInvitation.update({
          where: { id: inv.id },
          data: {
            status: 'ACTIVE',
            expiresAt: extendedExpiry,
            revokedAt: null,
            revokedBy: null
          }
        });

        if (needsReactivate) reactivatedCount++;
        if (needsExtend) validityExtendedCount++;
        console.log(`[ACTIVE] Intern ${inv.user?.fullName} (${inv.user?.employmentProfile?.employeeId}): reactivated to ACTIVE, expiresAt=${extendedExpiry.toISOString()}`);
      }
    }
  }

  console.log({
    reactivatedCount,
    markedSubmittedCount,
    validityExtendedCount
  });

  // 3. Now verify each link from intern_upload_links.txt
  console.log('\n--- Verifying intern_upload_links.txt ---');
  const fileContent = fs.readFileSync('intern_upload_links.txt', 'utf-8');
  const linkMatches = [...fileContent.matchAll(/Direct Link: https:\/\/[^\/]+\/upload\/([a-f0-9]+)/g)];

  let okActive = 0;
  let okSubmitted = 0;
  let broken = 0;

  for (let i = 0; i < linkMatches.length; i++) {
    const rawToken = linkMatches[i][1];
    const th = hashToken(rawToken);
    const inv = await prisma.idCardInvitation.findUnique({
      where: { tokenHash: th },
      include: { user: { include: { employmentProfile: true } } }
    });

    if (!inv) {
      console.error(`[BROKEN] Index ${i+1}: Token not found in DB!`);
      broken++;
    } else if (inv.status === 'ACTIVE') {
      okActive++;
    } else if (inv.status === 'SUBMITTED') {
      okSubmitted++;
    } else {
      console.error(`[UNEXPECTED] Index ${i+1}: ${inv.user?.fullName} has status ${inv.status}`);
      broken++;
    }
  }

  console.log(`Verification Results:
    Active Links (Ready for intern upload): ${okActive}
    Submitted Links (Already completed): ${okSubmitted}
    Broken / Blocked Links: ${broken}
    Total Verified: ${linkMatches.length}
  `);
}

main().catch(console.error).finally(() => prisma.$disconnect());
