/**
 * Database Seed Script
 * Creates initial admin user and sample data
 * 
 * Usage: npm run seed
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedDatabase = async () => {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 4000,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
    console.log('✅ Connected');

    // ── Create Admin User ────────────────────────────────────────
    console.log('🔄 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    await connection.execute(`
      INSERT IGNORE INTO users (name, email, password_hash, phone, role, status, joining_date)
      VALUES (?, ?, ?, ?, 'admin', 'active', CURRENT_DATE)
    `, ['Admin', 'admin@jamat.com', adminPassword, '+91-9876543210']);
    console.log('   ✅ Admin user created (email: admin@jamat.com, password: admin123)');

    // ── Create Sample Members ────────────────────────────────────
    console.log('🔄 Creating sample members...');
    const memberPassword = await bcrypt.hash('member123', 12);

    const members = [
      ['Ahmed Khan', 'ahmed@jamat.com', memberPassword, '+91-9876543211', 'member'],
      ['Bilal Hussain', 'bilal@jamat.com', memberPassword, '+91-9876543212', 'member'],
      ['Dawood Ali', 'dawood@jamat.com', memberPassword, '+91-9876543213', 'member'],
      ['Farhan Qureshi', 'farhan@jamat.com', memberPassword, '+91-9876543214', 'accountant'],
      ['Hamza Sheikh', 'hamza@jamat.com', memberPassword, '+91-9876543215', 'route_planner'],
      ['Ibrahim Patel', 'ibrahim@jamat.com', memberPassword, '+91-9876543216', 'member'],
      ['Junaid Ansari', 'junaid@jamat.com', memberPassword, '+91-9876543217', 'member'],
      ['Khalid Rahman', 'khalid@jamat.com', memberPassword, '+91-9876543218', 'member'],
    ];

    for (const member of members) {
      await connection.execute(`
        INSERT IGNORE INTO users (name, email, password_hash, phone, role, status, joining_date)
        VALUES (?, ?, ?, ?, ?, 'active', CURRENT_DATE)
      `, member);
    }
    console.log(`   ✅ ${members.length} sample members created (password: member123)`);

    // ── Create Sample Announcements ──────────────────────────────
    console.log('🔄 Creating sample announcements...');
    await connection.execute(`
      INSERT IGNORE INTO announcements (title, message, priority, created_by)
      VALUES 
        ('Welcome to Jamat Management', 'Assalamu Alaikum! Welcome to the Jamat Management System. All members are requested to update their profiles.', 'high', 1),
        ('Daily Routine Reminder', 'Please ensure you check the daily task list every morning after Fajr salah.', 'medium', 1),
        ('Upcoming Travel', 'InshaaAllah, our next journey is being planned. Route planners will update the details soon.', 'low', 1)
    `);
    console.log('   ✅ Sample announcements created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║  Admin Login Credentials:                 ║');
    console.log('║  Email:    admin@jamat.com                ║');
    console.log('║  Password: admin123                       ║');
    console.log('║                                           ║');
    console.log('║  Member Login Credentials:                ║');
    console.log('║  Email:    ahmed@jamat.com (or others)    ║');
    console.log('║  Password: member123                      ║');
    console.log('╚═══════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('💡 Run "npm run init-db" first to create the tables.');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
};

seedDatabase();
