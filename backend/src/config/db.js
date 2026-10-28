const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campus_auction',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // Parse DECIMAL into JS numbers
  dateStrings: true,    // Format dates cleanly without timezone distortion
});

// Test MySQL connection helper
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(
      `✓ MySQL connected successfully to database "${process.env.DB_NAME || 'campus_auction'}" at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`
    );
    connection.release();
    return true;
  } catch (error) {
    console.warn(`⚠ MySQL connection notice: ${error.message}`);
    console.warn(
      'To connect real MySQL data, ensure MySQL is running locally and run database/schema.sql and database/seed.sql.'
    );
    return false;
  }
};

module.exports = {
  pool,
  testConnection,
};
