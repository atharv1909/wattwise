const express = require('express');
const router = express.Router();
const { getStore } = require('../config/db');

// GET /api/v1/households
router.get('/', (req, res) => {
  const store = getStore();
  res.json({ households: store.households });
});

// GET /api/v1/households/:id
router.get('/:id', (req, res) => {
  const store = getStore();
  const id = Number(req.params.id);
  const household = store.households.find(h => h.id === id) || store.households[0];
  const rooms = store.rooms.filter(r => r.household_id === household.id);
  const appliances = store.appliances.filter(a => a.household_id === household.id);

  res.json({
    household,
    rooms,
    appliances
  });
});

// POST /api/v1/households/:id/appliances
router.post('/:id/appliances', (req, res) => {
  const store = getStore();
  const householdId = Number(req.params.id);
  const { custom_name, rated_w, bee_star_rating, daily_hours_guess, model_kind, category, room_id, pos_x, pos_y, pos_z } = req.body;

  const newAppliance = {
    id: store.appliances.length + 1,
    household_id: householdId,
    room_id: Number(room_id) || 1,
    catalog_id: 1,
    custom_name: custom_name || 'New Appliance',
    rated_w: Number(rated_w) || 100,
    standby_w: 1.0,
    bee_star_rating: Number(bee_star_rating) || 3,
    daily_hours_guess: Number(daily_hours_guess) || 4,
    model_kind: model_kind || 'scheduled',
    category: category || 'General',
    pos_x: Number(pos_x) || 0.0,
    pos_y: Number(pos_y) || 1.0,
    pos_z: Number(pos_z) || 0.0
  };

  store.appliances.push(newAppliance);
  res.status(201).json({ appliance: newAppliance });
});

// PATCH /api/v1/households/:id/appliances/:appId
router.patch('/:id/appliances/:appId', (req, res) => {
  const store = getStore();
  const appId = Number(req.params.appId);
  const index = store.appliances.findIndex(a => a.id === appId);

  if (index === -1) {
    return res.status(404).json({ error: { message: 'Appliance not found' } });
  }

  store.appliances[index] = { ...store.appliances[index], ...req.body };
  res.json({ appliance: store.appliances[index] });
});

// DELETE /api/v1/households/:id/appliances/:appId
router.delete('/:id/appliances/:appId', (req, res) => {
  const store = getStore();
  const appId = Number(req.params.appId);
  store.appliances = store.appliances.filter(a => a.id !== appId);
  res.json({ success: true, message: 'Appliance removed' });
});

module.exports = router;
