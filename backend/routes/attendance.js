import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/attendance — mark user joined
router.post('/', verifyToken, async (req, res) => {
  const { meeting_id, user_id } = req.body;
  const uid = user_id || req.user.id;

  if (!meeting_id) return res.status(400).json({ error: 'meeting_id is required' });

  try {
    // Upsert: if already joined, update joined_at
    const result = await pool.query(
      `INSERT INTO attendance (meeting_id, user_id, joined_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (meeting_id, user_id)
       DO UPDATE SET joined_at = NOW(), left_at = NULL
       RETURNING *`,
      [meeting_id, uid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// PATCH /api/attendance/leave — mark user left
router.patch('/leave', verifyToken, async (req, res) => {
  const { meeting_id, user_id } = req.body;
  const uid = user_id || req.user.id;

  if (!meeting_id) return res.status(400).json({ error: 'meeting_id is required' });

  try {
    const result = await pool.query(
      `UPDATE attendance SET left_at = NOW()
       WHERE meeting_id = $1 AND user_id = $2
       RETURNING *`,
      [meeting_id, uid]
    );
    res.json(result.rows[0] || { message: 'No record found' });
  } catch (err) {
    console.error('Leave attendance error:', err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// GET /api/attendance/:meetingId — full attendance report
router.get('/:meetingId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        a.id,
        u.id as user_id,
        u.name,
        a.joined_at,
        a.left_at,
        EXTRACT(EPOCH FROM (COALESCE(a.left_at, NOW()) - a.joined_at)) / 60 AS duration_mins
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.meeting_id = $1
       ORDER BY a.joined_at ASC`,
      [req.params.meetingId]
    );

    // Get meeting duration for percentage calc
    const meetResult = await pool.query(
      `SELECT scheduled_at, ended_at FROM meetings WHERE id = $1`,
      [req.params.meetingId]
    );
    const meeting = meetResult.rows[0];
    const totalMins = meeting?.ended_at
      ? (new Date(meeting.ended_at) - new Date(meeting.scheduled_at)) / 60000
      : 60; // default 60 min if still live

    const report = result.rows.map((p, i) => {
      const mins = parseFloat(p.duration_mins) || 0;
      const percentage = Math.min(100, Math.round((mins / totalMins) * 100));
      const status = percentage >= 80 ? 'present' : percentage >= 20 ? 'partial' : 'absent';
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      const totalTime = h > 0 ? `${h}h ${m}m` : `${m}:${String(Math.round((mins % 1) * 60)).padStart(2, '0')}`;
      return {
        id: `usr_${p.user_id}`,
        name: p.name,
        role: i === 0 ? 'Host' : 'Participant',
        joinCount: 1,
        leaveCount: p.left_at ? 1 : 0,
        totalTime,
        percentage,
        status,
        joined_at: p.joined_at,
        left_at: p.left_at,
      };
    });

    res.json(report);
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance report' });
  }
});

export default router;
