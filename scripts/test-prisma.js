const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const internCount = await prisma.user.count({ where: { role: 'INTERN' } });
  console.log(`[PASS] Prisma successfully queried database: ${internCount} interns found.`);

  const sample = await prisma.user.findFirst({
    where: { role: 'INTERN' },
    include: { employmentProfile: true }
  });
  console.log(`[PASS] Sample intern: ${sample.fullName} (${sample.employmentProfile?.employeeId})`);

  const invitationsCount = await prisma.idCardInvitation.count();
  console.log(`[PASS] Invitations count: ${invitationsCount}`);

  const photoSubsCount = await prisma.idCardPhotoSubmission.count();
  console.log(`[PASS] Photo submissions count: ${photoSubsCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
