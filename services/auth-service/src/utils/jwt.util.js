const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not defined in .env');
  process.exit(1);
}

function generateToken(user, roles = []) {
  return jwt.sign(
    { sub: user.id, email: user.email, roles },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

module.exports = { generateToken };
