/**
 * Finance Enhancement Migration
 * Adds receipt numbers, approval workflow, soft delete, planned expenses, settings
 * Run: npm run migrate
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const migrate = async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||4000,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
    console.log('✅ Connected. Running migration...');

    // Add new columns to transactions (safe — uses IF NOT EXISTS equivalent)
    const alterCols = [
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method ENUM('cash','bank','online','other') DEFAULT 'cash'`,
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(30) DEFAULT NULL`,
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_source ENUM('treasury','member') DEFAULT 'treasury'`,
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status ENUM('pending','approved','rejected') DEFAULT 'approved'`,
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_by INT DEFAULT NULL`,
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`,
      `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL`,
    ];
    for (const sql of alterCols) {
      try { await conn.execute(sql); } catch(e) { /* column may already exist */ }
    }
    console.log('   ✅ transactions columns updated');

    // Expense approvals table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS expense_approvals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        requested_by INT NOT NULL,
        approved_by INT DEFAULT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        notes VARCHAR(500) DEFAULT NULL,
        threshold_amount DECIMAL(12,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('   ✅ expense_approvals table');

    // Planned expenses table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS planned_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        planned_date DATE NOT NULL,
        category ENUM('food','travel','stationery','medical','utility','other') DEFAULT 'other',
        notes TEXT DEFAULT NULL,
        status ENUM('pending','completed','cancelled') DEFAULT 'pending',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ planned_expenses table');

    // Audit log table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) DEFAULT NULL,
        entity_id INT DEFAULT NULL,
        details TEXT DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_user (user_id)
      )
    `);
    console.log('   ✅ audit_log table');

    // Settings table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS jamat_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    // Default settings
    await conn.execute(`
      INSERT INTO jamat_settings (setting_key, setting_value) VALUES
        ('approval_threshold', '500'),
        ('jamat_name', 'Tableeghi Jamat'),
        ('currency', 'INR'),
        ('low_balance_alert', '100')
      ON DUPLICATE KEY UPDATE setting_key = setting_key
    `);
    console.log('   ✅ jamat_settings table + defaults');

    // Treasury transfers table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS treasury_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        direction ENUM('to_member','from_member') NOT NULL,
        member_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        reason VARCHAR(500) DEFAULT NULL,
        transfer_date DATE NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('   ✅ treasury_transfers table');

    console.log('\n🎉 Migration complete!');
    console.log('   Run "npm run seed" again if you want fresh sample data.\n');
  } catch(e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
};

migrate();
