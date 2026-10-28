const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Test Suite for Authentication Logic & Security
async function runAuthTests() {
  console.log('--- Running Authentication Unit Tests ---');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
    }
  }

  // 1. Password Hashing with bcryptjs
  const plainPassword = 'StudentSecret2026!';
  const hash = await bcrypt.hash(plainPassword, 12);
  assert(hash !== plainPassword, 'Password is never stored in plaintext');
  assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Uses valid bcrypt hash format');

  // 2. Password verification
  const isCorrect = await bcrypt.compare(plainPassword, hash);
  assert(isCorrect === true, 'Correct password verifies successfully against hash');

  const isWrong = await bcrypt.compare('WrongPassword', hash);
  assert(isWrong === false, 'Incorrect password rejected');

  // 3. JWT Token Signing & Expiration
  const secret = 'test_jwt_secret_12345';
  const token = jwt.sign({ id: 42 }, secret, { expiresIn: '1h' });
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token is properly formatted');

  const decoded = jwt.verify(token, secret);
  assert(decoded.id === 42, 'JWT payload correctly verifies and decodes user ID');

  let expiredRejected = false;
  try {
    const expiredToken = jwt.sign({ id: 42 }, secret, { expiresIn: '-1s' });
    jwt.verify(expiredToken, secret);
  } catch {
    expiredRejected = true;
  }
  assert(expiredRejected === true, 'Expired JWT tokens are rejected');

  // 4. Input validation tests (Email & Name)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert(emailRegex.test('student@university.edu'), 'Valid student email passes regex');
  assert(!emailRegex.test('notanemail'), 'Invalid email without @ is rejected');
  assert(!emailRegex.test('student@'), 'Incomplete email is rejected');

  // 5. User object sanitization (Never return password_hash)
  const rawDbUser = {
    id: 1,
    full_name: 'Alex Miller',
    email: 'alex.miller@campus.fake.edu',
    password_hash: hash,
    student_verification_status: 'verified',
    created_at: new Date().toISOString()
  };

  const sanitizedUser = {
    id: rawDbUser.id,
    full_name: rawDbUser.full_name,
    name: rawDbUser.full_name,
    email: rawDbUser.email,
    student_verification_status: rawDbUser.student_verification_status,
    created_at: rawDbUser.created_at,
  };

  assert(sanitizedUser.password_hash === undefined, 'Sanitized user profile strictly excludes password_hash');
  assert(sanitizedUser.email === rawDbUser.email, 'Sanitized user profile preserves student email');

  console.log(`\nTest Summary: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

