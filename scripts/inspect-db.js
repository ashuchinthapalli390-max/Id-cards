const { Client } = require('C:/Users/ashuc/OneDrive/Desktop/Codxa Agency/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully!');

  // Check tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Existing Public Tables:', tablesRes.rows.map(r => r.table_name));

  // Check columns of id_card_photo_submissions if exists
  const idCardColsRes = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'id_card_photo_submissions'
    ORDER BY ordinal_position;
  `);
  console.log('id_card_photo_submissions columns:', idCardColsRes.rows);

  // Check existing records in id_card_photo_submissions
  const idCardRowsRes = await client.query(`SELECT * FROM id_card_photo_submissions;`);
  console.log('id_card_photo_submissions rows count:', idCardRowsRes.rows.length);
  if (idCardRowsRes.rows.length > 0) {
    console.log('Sample row:', idCardRowsRes.rows[0]);
  }

  // Check sample intern record from User and EmploymentProfile
  const sampleInternRes = await client.query(`
    SELECT 
      u.id as user_id, 
      u.username, 
      u.email, 
      u."fullName", 
      u.role, 
      u."orgRole",
      u.phone,
      ep.id as profile_id,
      ep."employeeId",
      ep.department,
      ep."academicBranch",
      ep.college,
      ep.status
    FROM "User" u
    LEFT JOIN "EmploymentProfile" ep ON ep."userId" = u.id
    WHERE u.role = 'INTERN'
    LIMIT 5;
  `);
  console.log('Sample interns in DB:', sampleInternRes.rows);

  // Check admin users
  const adminRes = await client.query(`
    SELECT id, username, email, role, "orgRole", "fullName"
    FROM "User"
    WHERE role IN ('FOUNDER', 'CO_FOUNDER', 'CTO', 'HR', 'OWNER') 
       OR "orgRole" IN ('FOUNDER', 'CO_FOUNDER', 'CTO', 'HR');
  `);
  console.log('Admin users:', adminRes.rows);

  await client.end();
}

main().catch(console.error);
