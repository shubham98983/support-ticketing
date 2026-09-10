const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// GET /users — any authenticated user can see the list of agents/supervisors
// (needed to populate reassignment and collaborator dropdowns). Never
// returns password_hash.
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY name ASC');
  res.json(result.rows);
});

module.exports = router;