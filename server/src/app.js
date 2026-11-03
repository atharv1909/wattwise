const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const tariffRoutes = require('./routes/tariffs');
const householdRoutes = require('./routes/households');
const billRoutes = require('./routes/bill');
const simulationRoutes = require('./routes/simulation');
const whatifRoutes = require('./routes/whatif');
const readingsRoutes = require('./routes/readings');
const copilotRoutes = require('./routes/copilot');
const adminRoutes = require('./routes/admin');
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');
const splitRoutes = require('./routes/split');

const app = express();

app.use(cors());
app.use(express.json());

// API v1 Mounts
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tariffs', tariffRoutes);
app.use('/api/v1/households', householdRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/simulation', simulationRoutes);
app.use('/api/v1/whatif', whatifRoutes);
app.use('/api/v1/readings', readingsRoutes);
app.use('/api/v1/copilot', copilotRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/split', splitRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'WattWise', version: '1.0.0' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
});

module.exports = app;
