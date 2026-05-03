import express from 'express';
import pool from '../db.js';
import { generateEmbedding, cosineSimilarity } from '../services/faceService.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const THRESHOLD = parseFloat(process.env.FACE_THRESHOLD) || 0.75;

/**
 * POST /api/face/enroll
 * Body: { user_id: number, image: string (base64 data URI or raw) }
 */
router.post('/enroll', verifyToken, async (req, res) => {
  try {
    const { image } = req.body;
    const user_id = req.body.user_id || req.user.id;

    if (!image) {
      return res.status(400).json({ error: 'image is required' });
    }

    console.log(`Starting face enrollment for user ${user_id}`);
    const embedding = await generateEmbedding(image);

    if (!embedding) {
      return res.status(400).json({ error: 'Could not generate face embedding. Try a clearer image.' });
    }

    const embeddingArray = Array.from(embedding);

    // Delete existing embeddings for user (re-enroll)
    await pool.query('DELETE FROM face_embeddings WHERE user_id = $1', [user_id]);

    const query = `
      INSERT INTO face_embeddings (user_id, embedding)
      VALUES ($1, $2::float8[])
      RETURNING id;
    `;
    await pool.query(query, [user_id, embeddingArray]);

    res.json({ success: true, message: 'Face enrolled successfully.' });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Internal server error during face enrollment.', details: error.message });
  }
});

/**
 * POST /api/face/recognize
 * Body: { image: string (base64), meeting_id?: number }
 */
router.post('/recognize', verifyToken, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'image is required' });
    }

    // 1. Generate embedding for incoming image
    const incomingEmbedding = await generateEmbedding(image);

    if (!incomingEmbedding) {
      return res.json({ matched: false, user_id: null, message: 'Could not process image.' });
    }

    // 2. Fetch all enrolled embeddings
    const dbResult = await pool.query('SELECT user_id, embedding FROM face_embeddings');
    const storedEmbeddings = dbResult.rows;

    if (storedEmbeddings.length === 0) {
      return res.json({ matched: false, user_id: null, message: 'No enrolled faces.' });
    }

    let bestMatchUserId = null;
    let highestConfidence = 0;

    // 3. Compare using cosine similarity
    for (const record of storedEmbeddings) {
      const score = cosineSimilarity(incomingEmbedding, record.embedding);
      if (score > highestConfidence) {
        highestConfidence = score;
        bestMatchUserId = record.user_id;
      }
    }

    // 4. Return result
    if (highestConfidence >= THRESHOLD && bestMatchUserId !== null) {
      // Fetch user name
      const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [bestMatchUserId]);
      return res.json({
        matched: true,
        user_id: bestMatchUserId,
        user_name: userResult.rows[0]?.name || null,
        confidence: highestConfidence,
      });
    } else {
      return res.json({
        matched: false,
        user_id: null,
        confidence: highestConfidence,
        message: 'Unknown user',
      });
    }
  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ error: 'Internal server error during face recognition.', details: error.message });
  }
});

export default router;
