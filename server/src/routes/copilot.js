const express = require('express');
const router = express.Router();
const { handleCopilotQuery } = require('../services/copilot');
const { getStore } = require('../config/db');

// POST /api/v1/copilot/chat
router.post('/chat', async (req, res) => {
  const { message, lang, householdId } = req.body;
  if (!message) {
    return res.status(400).json({ error: { message: 'Message cannot be empty' } });
  }

  const store = getStore();
  const hId = Number(householdId) || 1;
  const appliances = store.appliances.filter(a => a.household_id === hId);

  try {
    const response = await handleCopilotQuery(message, appliances, lang || 'en', { currentUnits: 185 });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to process copilot query', details: err.message } });
  }
});

module.exports = router;
