import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/transcripts — store a single transcript chunk
router.post('/', verifyToken, async (req, res) => {
  const { meeting_id, text, timestamp } = req.body;
  const user_id = req.body.user_id || req.user.id;

  if (!meeting_id || !text) {
    return res.status(400).json({ error: 'meeting_id and text are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO transcripts (meeting_id, user_id, text, timestamp)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [meeting_id, user_id, text.trim(), timestamp || new Date().toISOString()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Save transcript error:', err);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// GET /api/transcripts/:meetingId — fetch all for a meeting
router.get('/:meetingId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name as speaker_name
       FROM transcripts t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.meeting_id = $1
       ORDER BY t.timestamp ASC`,
      [req.params.meetingId]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      speaker: row.speaker_name || 'Unknown',
      text: row.text,
      timestamp: row.timestamp,
      user_id: row.user_id,
    })));
  } catch (err) {
    console.error('Fetch transcripts error:', err);
    res.status(500).json({ error: 'Failed to fetch transcripts' });
  }
});

export default router;
