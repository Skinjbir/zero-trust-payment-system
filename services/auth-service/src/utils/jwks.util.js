const fs = require('fs');
const jwk = require('pem-jwk');
const path = require('path');

const publicPem = fs.readFileSync(path.join(__dirname, '../keys/public.pem'), 'utf8');
const jwkKey = jwk.pem2jwk(publicPem);
jwkKey.kid = 'auth-key-1';
jwkKey.use = 'sig';
jwkKey.alg = 'RS256';

module.exports = {
  keys: [jwkKey]
};
