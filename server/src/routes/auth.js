const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getStore } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'wattwise_super_secret_key_tpds3';

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const store = getStore();

  const user = store.users.find(u => u.email === (email || 'demo@wattwise.in'));
  if (!user) {
    return res.status(401).json({ error: { code: 'AUTH_FAILED', message: 'Invalid email or password' } });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// GET /api/v1/auth/me
router.get('/me', (req, res) => {
  const store = getStore();
  const user = store.users[0];
  return res.json({ user });
});

module.exports = router;
