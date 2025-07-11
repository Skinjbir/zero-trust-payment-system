const { getUserByIdFromDB } = require('../models/user.model');

exports.getProfile = async (req, res) => {
  const userId = req.user.sub;
  const user = await getUserByIdFromDB(userId);
  res.json(user);
};

exports.getUserById = async (req, res) => {
  const user = await getUserByIdFromDB(req.params.id);
  res.json(user);
};
