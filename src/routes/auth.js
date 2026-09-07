const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// In a real deployment this MUST come from an environment variable.
// Never hardcode a secret in source — this fallback exists only so local
// dev doesn't crash if .env is momentarily missing it; set JWT_SECRET in
// your .env before doing anything real with this.
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  // Deliberately identical error for "no such user" and "wrong password" —
  // never let a login endpoint reveal which emails exist in the system.
  const genericError = { error: 'Invalid email or password.' };

  if (!user) {
    return res.status(401).json(genericError);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json(genericError);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

module.exports = router;