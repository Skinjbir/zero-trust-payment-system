const { insertAuditLog, getAuditLogs } = require('../models/audit.model');

exports.logEvent = async (req, res) => {
  try {
    const {
      service_name,
      user_id,
      action,
      resource,
      resource_id,
      status,
      metadata
    } = req.body;

    await insertAuditLog({
      service_name,
      user_id,
      action,
      resource,
      resource_id,
      status,
      metadata
    });

    res.status(201).json({ message: 'Audit logged' });
  } catch (err) {
    console.error('[AUDIT LOGGING ERROR]', err);
    res.status(500).json({ error: 'Failed to log event' });
  }
};

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await getAuditLogs();
    res.json(logs);
  } catch (err) {
    console.error('[FETCH AUDIT LOGS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};
