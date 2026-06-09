/**
 * Database Initialization Script
 * Creates the jamat_db database and all required tables in TiDB
 * 
 * Usage: npm run init-db
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  let connection;

  try {
    // Step 1: Connect without specifying a database to create it
    console.log('🔄 Connecting to TiDB Cloud...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 4000,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
    console.log('✅ Connected to TiDB Cloud');

    // Step 2: Create database if not exists
    const dbName = process.env.DB_NAME || 'jamat_db';
    console.log(`🔄 Creating database "${dbName}"...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.execute(`USE \`${dbName}\``);
    console.log(`✅ Database "${dbName}" ready`);

    // Step 3: Create all tables
    console.log('🔄 Creating tables...');

    // ── Users Table ──────────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        role ENUM('admin', 'member', 'accountant', 'route_planner') DEFAULT 'member',
        joining_date DATE DEFAULT (CURRENT_DATE),
        status ENUM('active', 'inactive', 'leave') DEFAULT 'active',
        current_duty VARCHAR(100) DEFAULT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ users table created');

    // ── Transactions Table (Financial Accounting) ────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description VARCHAR(500) DEFAULT NULL,
        category ENUM('contribution', 'food', 'travel', 'accommodation', 'supplies', 'medical', 'communication', 'other') DEFAULT 'other',
        transaction_date DATE NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_date (user_id, transaction_date),
        INDEX idx_date (transaction_date)
      )
    `);
    console.log('   ✅ transactions table created');

    // ── Routes Table (Travel Planning) ───────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS routes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        destination VARCHAR(200) NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE DEFAULT NULL,
        purpose VARCHAR(500) DEFAULT NULL,
        activities TEXT DEFAULT NULL,
        status ENUM('completed', 'in_progress', 'planned', 'cancelled') DEFAULT 'planned',
        notes TEXT DEFAULT NULL,
        latitude DECIMAL(10, 7) DEFAULT NULL,
        longitude DECIMAL(10, 7) DEFAULT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_dates (date_from, date_to)
      )
    `);
    console.log('   ✅ routes table created');

    // ── Tasks Table (Daily Task Management) ──────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT DEFAULT NULL,
        task_date DATE NOT NULL,
        due_time TIME DEFAULT NULL,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        assigned_to INT DEFAULT NULL,
        category ENUM('bayan', 'dawah', 'meal_prep', 'cleaning', 'security', 'finance', 'travel', 'other') DEFAULT 'other',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_date_status (task_date, status),
        INDEX idx_assigned (assigned_to)
      )
    `);
    console.log('   ✅ tasks table created');

    // ── Duty Roster Table ────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS duty_roster (
        id INT AUTO_INCREMENT PRIMARY KEY,
        duty_type ENUM('meal', 'cleaning', 'security', 'finance', 'shopping', 'other') NOT NULL,
        assigned_to INT NOT NULL,
        duty_date DATE NOT NULL,
        shift ENUM('morning', 'afternoon', 'evening', 'full_day') DEFAULT 'full_day',
        status ENUM('pending', 'completed') DEFAULT 'pending',
        notes VARCHAR(500) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (duty_date),
        INDEX idx_assigned (assigned_to),
        UNIQUE KEY unique_duty (duty_type, assigned_to, duty_date, shift)
      )
    `);
    console.log('   ✅ duty_roster table created');

    // ── Attendance Table ─────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        attendance_date DATE NOT NULL,
        status ENUM('present', 'absent', 'leave', 'excused') DEFAULT 'present',
        notes VARCHAR(300) DEFAULT NULL,
        marked_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_attendance (user_id, attendance_date),
        INDEX idx_date (attendance_date)
      )
    `);
    console.log('   ✅ attendance table created');

    // ── Meals Table ──────────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS meals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meal_date DATE NOT NULL,
        meal_type ENUM('suhoor', 'breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
        menu VARCHAR(500) DEFAULT NULL,
        ingredients TEXT DEFAULT NULL,
        estimated_cost DECIMAL(10, 2) DEFAULT NULL,
        cook_id INT DEFAULT NULL,
        status ENUM('planned', 'preparing', 'served', 'cancelled') DEFAULT 'planned',
        notes VARCHAR(500) DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cook_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (meal_date),
        UNIQUE KEY unique_meal (meal_date, meal_type)
      )
    `);
    console.log('   ✅ meals table created');

    // ── Announcements Table ──────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        is_active TINYINT(1) DEFAULT 1,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_active (is_active),
        INDEX idx_priority (priority)
      )
    `);
    console.log('   ✅ announcements table created');

    // ── Reminders Table ──────────────────────────────────────────
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT DEFAULT NULL,
        reminder_time DATETIME NOT NULL,
        type ENUM('task', 'prayer', 'travel', 'meeting', 'custom') DEFAULT 'custom',
        target_user_id INT DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_time (reminder_time),
        INDEX idx_target (target_user_id)
      )
    `);
    console.log('   ✅ reminders table created');

    console.log('\n🎉 All tables created successfully!');
    console.log('📝 Next step: Run "npm run seed" to create the admin user.\n');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
};

initDatabase();
