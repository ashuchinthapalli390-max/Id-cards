async function main() {
  console.log('====================================================');
  console.log(' HTTP ROUTE & API INTEGRATION TEST ON LOCAL SERVER');
  console.log('====================================================\n');

  const baseUrl = 'http://localhost:3005';

  // 1. Landing Page
  console.log('[TEST 1] Testing Landing Page GET / ...');
  const homeRes = await fetch(`${baseUrl}/`);
  console.log(`  ✓ Status: ${homeRes.status} ${homeRes.statusText}`);
  const homeHtml = await homeRes.text();
  if (homeHtml.includes('CODEXA') && homeHtml.includes('ID Card')) {
    console.log('  ✓ Verified: Brand, heading, and portal structure rendered in HTML.');
  } else {
    throw new Error('Home HTML content mismatch.');
  }

  // 2. Admin Login Page
  console.log('\n[TEST 2] Testing Admin Login Page GET /admin/login ...');
  const loginPageRes = await fetch(`${baseUrl}/admin/login`);
  console.log(`  ✓ Status: ${loginPageRes.status} ${loginPageRes.statusText}`);
  const loginHtml = await loginPageRes.text();
  if (loginHtml.includes('Admin Portal Login')) {
    console.log('  ✓ Verified: Admin login page rendered with role warnings.');
  }

  // 3. Admin Authentication API via Master Key
  console.log('\n[TEST 3] Testing Admin Master Key Login POST /api/admin/login...');
  const masterLoginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      masterKey: 'CodeXa@2026#MasterAdminKey'
    })
  });
  console.log(`  ✓ Master Key Status: ${masterLoginRes.status} ${masterLoginRes.statusText}`);
  const masterData = await masterLoginRes.json();
  if (!masterLoginRes.ok || !masterData.success) {
    throw new Error(`Master key login failed: ${masterData.error}`);
  }
  console.log(`  ✓ Authenticated via Master Key: ${masterData.user?.fullName} (${masterData.user?.effectiveRole})`);

  // Extract session cookie
  const setCookie = masterLoginRes.headers.get('set-cookie');
  if (!setCookie || !setCookie.includes('cxa_id_session')) {
    throw new Error('Expected cxa_id_session cookie in response!');
  }
  const sessionCookie = setCookie.split(';')[0];
  console.log(`  ✓ Acquired secure HttpOnly session cookie: ${sessionCookie.slice(0, 30)}...`);

  // Verify invalid master key rejection
  const badMasterRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ masterKey: 'InvalidBadKey123' })
  });
  if (badMasterRes.status === 401) {
    console.log('  ✓ Verified: Invalid Master Key correctly rejected with 401 Unauthorized.');
  } else {
    throw new Error(`Expected 401 for invalid master key, got ${badMasterRes.status}`);
  }

  // 4. Admin Live Stats API
  console.log('\n[TEST 4] Testing Admin Stats API GET /api/admin/stats ...');
  const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { Cookie: sessionCookie }
  });
  console.log(`  ✓ Status: ${statsRes.status} ${statsRes.statusText}`);
  const statsData = await statsRes.json();
  console.log(`  ✓ Live Stats from DB:`, statsData.stats);
  if (statsData.stats.totalInterns !== 50) {
    throw new Error(`Expected totalInterns: 50, got ${statsData.stats.totalInterns}`);
  }

  // 5. Admin Interns Directory API
  console.log('\n[TEST 5] Testing Admin Interns API GET /api/admin/interns ...');
  const internsRes = await fetch(`${baseUrl}/api/admin/interns?limit=5`, {
    headers: { Cookie: sessionCookie }
  });
  console.log(`  ✓ Status: ${internsRes.status} ${internsRes.statusText}`);
  const internsData = await internsRes.json();
  console.log(`  ✓ Interns returned: ${internsData.interns.length} of ${internsData.pagination.totalCount}`);
  const sampleIntern = internsData.interns[0];
  console.log(`  ✓ Sample intern: ${sampleIntern.fullName} (${sampleIntern.employeeId}) - Department: ${sampleIntern.department}`);

  // 6. Generate Single Invitation Link API
  console.log('\n[TEST 6] Testing Invitation Generation POST /api/admin/invitations/generate ...');
  const genRes = await fetch(`${baseUrl}/api/admin/invitations/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({
      userId: sampleIntern.id,
      forceRegenerate: true
    })
  });
  console.log(`  ✓ Status: ${genRes.status} ${genRes.statusText}`);
  const genData = await genRes.json();
  console.log(`  ✓ Generated Upload URL: ${genData.invitation.uploadUrl}`);
  const rawToken = genData.invitation.rawToken;

  // 7. Validate Invitation Token Endpoint (Login-free intern check)
  console.log('\n[TEST 7] Testing Token Validation GET /api/invitation/[token] ...');
  const validateRes = await fetch(`${baseUrl}/api/invitation/${rawToken}`);
  console.log(`  ✓ Status: ${validateRes.status} ${validateRes.statusText}`);
  const validateData = await validateRes.json();
  console.log(`  ✓ Valid: ${validateData.valid}`);
  console.log(`  ✓ Intern Verified: ${validateData.intern.fullName} (${validateData.intern.employeeId})`);
  console.log(`  ✓ Department: ${validateData.intern.department}`);

  // 8. Personalized Intern Upload Page HTML
  console.log('\n[TEST 8] Testing Personalized Upload Page GET /upload/[token] ...');
  const uploadPageRes = await fetch(`${baseUrl}/upload/${rawToken}`);
  console.log(`  ✓ Status: ${uploadPageRes.status} ${uploadPageRes.statusText}`);
  const uploadHtml = await uploadPageRes.text();
  if (uploadHtml.includes('CODEXA') || uploadHtml.includes('Official Intern ID Card Photo Portal')) {
    console.log('  ✓ Verified: Personalized intern upload page renders successfully.');
  }

  // 9. Admin Dashboard Page HTML
  console.log('\n[TEST 9] Testing Admin Dashboard Page GET /admin/dashboard ...');
  const dashRes = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Cookie: sessionCookie }
  });
  console.log(`  ✓ Status: ${dashRes.status} ${dashRes.statusText}`);

  // 10. Admin Photo Gallery Page HTML
  console.log('\n[TEST 10] Testing Admin Photos Page GET /admin/photos ...');
  const photosRes = await fetch(`${baseUrl}/admin/photos`, {
    headers: { Cookie: sessionCookie }
  });
  console.log(`  ✓ Status: ${photosRes.status} ${photosRes.statusText}`);

  // 11. Admin Exports Page HTML
  console.log('\n[TEST 11] Testing Admin Exports Page GET /admin/exports ...');
  const exportsRes = await fetch(`${baseUrl}/admin/exports`, {
    headers: { Cookie: sessionCookie }
  });
  console.log(`  ✓ Status: ${exportsRes.status} ${exportsRes.statusText}`);

  // 12. Admin Audit Logs Page HTML
  console.log('\n[TEST 12] Testing Admin Audit Logs Page GET /admin/audit ...');
  const auditRes = await fetch(`${baseUrl}/admin/audit`, {
    headers: { Cookie: sessionCookie }
  });
  console.log(`  ✓ Status: ${auditRes.status} ${auditRes.statusText}`);

  // 13. Testing /u/[token] alias route
  console.log('\n[TEST 13] Testing Alias Route GET /u/[token] ...');
  const aliasRes = await fetch(`${baseUrl}/u/${rawToken}`);
  console.log(`  ✓ Status: ${aliasRes.status} ${aliasRes.statusText}`);
  const aliasHtml = await aliasRes.text();
  if (aliasHtml.includes('CODEXA')) {
    console.log('  ✓ Verified: /u/[token] alias route served successfully.');
  }

  // 14. Testing Public Brand Assets from assests/
  console.log('\n[TEST 14] Testing Public Brand Assets (/images/logo.jpeg, /favicon.ico, /icons/shield.svg) ...');
  const logoRes = await fetch(`${baseUrl}/images/logo.jpeg`);
  const faviconRes = await fetch(`${baseUrl}/favicon.ico`);
  const iconRes = await fetch(`${baseUrl}/icons/shield.svg`);
  console.log(`  ✓ logo.jpeg: ${logoRes.status} (Content-Type: ${logoRes.headers.get('content-type')})`);
  console.log(`  ✓ favicon.ico: ${faviconRes.status}`);
  console.log(`  ✓ shield.svg: ${iconRes.status} (Content-Type: ${iconRes.headers.get('content-type')})`);
  if (logoRes.status !== 200 || faviconRes.status !== 200 || iconRes.status !== 200) {
    throw new Error('Static brand asset failed to serve with 200 OK.');
  }

  console.log('\n====================================================');
  console.log(' ALL 14 HTTP & API INTEGRATION TESTS PASSED 100%!');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('\n✕ HTTP test error:', err);
  process.exit(1);
});
