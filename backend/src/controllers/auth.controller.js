const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Helper to sign JWT
const signToken = (id) =>
  jwt.sign(
    { id },
    process.env.JWT_SECRET || 'campus_auction_jwt_secret_dev_key_2026',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

// Helper for cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

/**
 * @desc    Register a new student user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { full_name, name, email, password } = req.body;
    const studentName = (full_name || name || '').trim();
    const studentEmail = (email || '').trim().toLowerCase();

    // 1. Validation: Full Name
    if (!studentName || studentName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required and must be at least 2 characters long.',
      });
    }

    if (studentName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Full name must not exceed 100 characters.',
      });
    }

    // 2. Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!studentEmail || !emailRegex.test(studentEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (studentEmail.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Email address must not exceed 150 characters.',
      });
    }

    // 3. Validation: Password strength
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must not exceed 128 characters.',
      });
    }

    // 4. Check for duplicate email (parameterized query)
    const checkSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
    const [existingUsers] = await pool.query(checkSql, [studentEmail]);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.',
      });
    }

    // 5. Secure password hashing with bcryptjs (salt rounds = 12)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 6. Insert new user with default 'unverified' status into MySQL
    const insertSql = `
      INSERT INTO users (full_name, email, password_hash, student_verification_status)
      VALUES (?, ?, ?, 'unverified')
    `;
    const [result] = await pool.query(insertSql, [studentName, studentEmail, passwordHash]);
    const newUserId = result.insertId;

    // 7. Retrieve created user profile (exclude password_hash)
    const selectSql = `
      SELECT id, full_name, email, student_verification_status, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(selectSql, [newUserId]);
    const user = rows[0];

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      student_verification_status: user.student_verification_status,
      created_at: user.created_at,
    };

    // 8. Generate JWT token and set HttpOnly cookie
    const token = signToken(user.id);
    res.cookie('token', token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Error in POST /api/auth/register:', error);
    // Duplicate entry safeguard in case of concurrent insert race condition
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to complete registration due to a server error. Please try again.',
      error: error.message,
    });
  }
};

/**
 * @desc    Authenticate student user & get session
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const studentEmail = (email || '').trim().toLowerCase();

    // 1. Validate presence of credentials
    if (!studentEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your email address and password.',
      });
    }

    // 2. Query user by email (parameterized query)
    const sql = `
      SELECT id, full_name, email, password_hash, student_verification_status, created_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [studentEmail]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const user = rows[0];

    // 3. Compare password with stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // 4. Generate JWT token and set HttpOnly cookie
    const token = signToken(user.id);
    res.cookie('token', token, getCookieOptions());

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      student_verification_status: user.student_verification_status,
      created_at: user.created_at,
    };

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sign in due to a server error. Please try again.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get current authenticated student's profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by protect middleware)
 */
exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
      error: error.message,
    });
  }
};

/**
 * @desc    Log out current student and clear HttpOnly cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Error in POST /api/auth/logout:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log out.',
      error: error.message,
    });
  }
};
