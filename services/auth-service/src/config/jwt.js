const fs = require('fs');
const path = require('path');

const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, '../keys/public.pem'), 'utf8');

const PRIVATE_KEY = fs.readFileSync(path.join(__dirname, '../keys/private.pem'), 'utf8');

module.exports = {
  PUBLIC_KEY,
  PRIVATE_KEY, 
};
