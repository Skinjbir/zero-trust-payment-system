const notificationService = require('../services/notificationService');

exports.getAll = async (req, res) => {
  try {
    const result = await notificationService.getAll(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.getById = async (req, res) => {
  try {
    const notification = await notificationService.getById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
};

exports.sendTest = async (req, res) => {
  try {
    const result = await notificationService.sendToQueue(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
};
