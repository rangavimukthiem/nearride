const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
const env = require('../src/config/env');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  let connection;

  try {
    // Attempt creating the database if privileges allow (standard in local dev/bootstrap)
    try {
      const adminConn = await mariadb.createConnection({
        ...env.db,
        database: undefined
      });
      await adminConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      );
      await adminConn.end();
    } catch (_) {
      // In EKAFY multi-tenant setups, the db_tenant_<slug> database is pre-created by the platform
    }

    connection = await mariadb.createConnection({
      ...env.db,
      database: env.db.database,
      multipleStatements: true
    });

    await connection.query(sql);

    // Idempotent column migrations for updates
    await connection.query(`ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS driver_license_number_encrypted TEXT AFTER registration_number_masked, 
      ADD COLUMN IF NOT EXISTS driver_license_number_masked VARCHAR(30) AFTER driver_license_number_encrypted, 
      ADD COLUMN IF NOT EXISTS reviewed_at DATETIME AFTER moderation_note`);

    await connection.query(`ALTER TABLE provider_profiles 
      ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE AFTER completed_profile`);

    console.log(`Database schema applied successfully to '${env.db.database}'.`);
  } finally {
    if (connection) await connection.end();
  }
})().catch((e) => {
  console.error('Migration error:', e.message);
  process.exit(1);
});
