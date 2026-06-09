/**
 * Database Configuration
 * Establishes connection pool to TiDB Cloud (MySQL-compatible)
 * Uses SSL for secure cloud connections
 *
 * IMPORTANT: Use pool.query() instead of pool.execute() for queries
 * with LIMIT/OFFSET — TiDB prepared statements require integer literals
 * for LIMIT/OFFSET, not bound parameters. pool.query() escapes inline
 * which works correctly with TiDB.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  namedPlaceholders: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // TiDB specific: handle timezone
  timezone: '+00:00'
});

/**
 * Test the database connection on startup
 */
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to TiDB Cloud database');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Please check your .env configuration and ensure TiDB Cloud is accessible.');
  }
};

testConnection();

module.exports = pool;
