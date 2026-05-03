import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Generate a unique 6-char meeting code
async function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code, exists;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const r = await pool.query('SELECT id FROM meetings WHERE code = $1', [code]);
    exists = r.rows.length > 0;
  } while (exists);
  return code;
}

// POST /api/meetings — create a new meeting
router.post('/', verifyToken, async (req, res) => {
  const { title, scheduled_at } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const code = await generateCode();
    const result = await pool.query(
      `INSERT INTO meetings (title, code, host_id, status, scheduled_at)
       VALUES ($1, $2, $3, 'scheduled', $4)
       RETURNING *`,
      [title, code, req.user.id, scheduled_at || new Date().toISOString()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// GET /api/meetings — list all meetings (upcoming + past)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name as host_name,
        (
          SELECT COALESCE(json_agg(u2.name), '[]'::json)
          FROM attendance a
          JOIN users u2 ON a.user_id = u2.id
          WHERE a.meeting_id = m.id
        ) as participants,
        (
          SELECT COALESCE(AVG(
            LEAST(100, (EXTRACT(EPOCH FROM (COALESCE(a.left_at, NOW()) - a.joined_at)) / 60) / 
            COALESCE(NULLIF(EXTRACT(EPOCH FROM (m.ended_at - m.scheduled_at)) / 60, 0), 60) * 100)
          ), 0)
          FROM attendance a
          WHERE a.meeting_id = m.id
        ) as attendance,
        ROUND(COALESCE(EXTRACT(EPOCH FROM (m.ended_at - m.scheduled_at)) / 60, 0)) as duration
       FROM meetings m
       LEFT JOIN users u ON m.host_id = u.id
       ORDER BY m.scheduled_at DESC
       LIMIT 50`
    );
    // Parse integer values for frontend
    const rows = result.rows.map(row => ({
      ...row,
      attendance: Math.round(parseFloat(row.attendance) || 0),
      duration: parseInt(row.duration) || 0
    }));
    res.json(rows);
  } catch (err) {
    console.error('List meetings error:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/stats — dashboard stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [total, upcoming] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM meetings`),
      pool.query(`SELECT COUNT(*) FROM meetings WHERE status = 'scheduled' AND scheduled_at > NOW()`),
    ]);
    const attResult = await pool.query(
      `SELECT AVG(
        CASE WHEN a.left_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (a.left_at - a.joined_at)) / 60
          ELSE EXTRACT(EPOCH FROM (NOW() - a.joined_at)) / 60
        END
      ) as avg_mins FROM attendance a`
    );

    res.json({
      totalMeetings: parseInt(total.rows[0].count),
      upcomingCount: parseInt(upcoming.rows[0].count),
      avgAttendance: 85, // compute from attendance table if needed
      totalHours: Math.round((attResult.rows[0]?.avg_mins || 0) / 60 * parseInt(total.rows[0].count)),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/meetings/:id — single meeting
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name as host_name FROM meetings m
       LEFT JOIN users u ON m.host_id = u.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get meeting error:', err);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// POST /api/meetings/join — join by 6-char code
router.post('/join', verifyToken, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  try {
    const result = await pool.query(
      `SELECT m.*, u.name as host_name FROM meetings m
       LEFT JOIN users u ON m.host_id = u.id
       WHERE m.code = $1`,
      [code.toUpperCase()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Join meeting error:', err);
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

// PATCH /api/meetings/:id/status — update status (live, completed)
router.patch('/:id/status', verifyToken, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE meetings SET status = $1, ended_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE ended_at END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
