const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Middleware to protect routes and verify authentication via HttpOnly cookie or Bearer token
 */
exports.protect = async (req, res, next) => {
  let token;

  // 1. Check HttpOnly cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fall back to Authorization: Bearer <token> header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to access this resource.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'campus_auction_jwt_secret_dev_key_2026'
    );

    // Verify user exists in MySQL database (never select password_hash)
    const sql = `
      SELECT id, full_name, email, student_verification_status, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [decoded.id]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.',
      });
    }

    const user = rows[0];
    req.user = {
      id: user.id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      student_verification_status: user.student_verification_status,
      created_at: user.created_at,
    };

    next();
  } catch (err) {
    console.error('Auth verification error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.',
    });
  }
};

/**
 * Optional authorization middleware for future role/verification-based actions
 */
exports.authorizeVerification = (status = 'verified') => (req, res, next) => {
  if (!req.user || req.user.student_verification_status !== status) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Only ${status} students may perform this action.`,
    });
  }
  next();
};
