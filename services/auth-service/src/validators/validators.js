


exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

exports.validatePassword = (password) => {
  // Minimum 8 characters, at least one letter and one number
  return password && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
};