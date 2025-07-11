const jwt = require('jsonwebtoken');
const { PRIVATE_KEY } = require('../config/jwt');

function generateToken(user, roles = []) {
  const payload = {
    sub: user.id,
    email: user.email,
    roles, 
  };

  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '2h',
    keyid: 'auth-key-1', 
  });
}

module.exports = { generateToken };


