const express = require('express');
const dotenv = require('dotenv');
const auditRoutes = require('./routes/audit.routes');
const app = express();
dotenv.config();

app.use(express.json());
app.use('/audit-log', auditRoutes);

app.get('/health', (req, res) => res.send({ status: 'Audit service running' }));

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`Audit service listening on port ${PORT}`));
