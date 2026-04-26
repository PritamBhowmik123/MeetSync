import express from 'express';
import pool from '../db.js';
import { generateEmbedding, cosineSimilarity } from '../services/faceService.js';

const router = express.Router();

/**
 * POST /api/face/enroll
 * Body: { user_id: number, image: string (base64) }
 */
router.post('/enroll', async (req, res) => {
  try {
    const { user_id, image } = req.body;

    if (!user_id || !image) {
      return res.status(400).json({ error: 'user_id and image are required' });
    }

    console.log(`Starting face enrollment for user ${user_id}`);
    const embedding = await generateEmbedding(image);

    if (!embedding) {
      return res.status(400).json({ error: 'No face detected in the image. Please try again.' });
    }

    // Convert Float32Array to standard JS Array for Postgres
    const embeddingArray = Array.from(embedding);

    // Save to database
    // The schema assumes table face_embeddings with columns: id, user_id, embedding, created_at
    // But what if the user doesn't exist? (Due to foreign key). Let's catch DB errors.
    const query = `
      INSERT INTO face_embeddings (user_id, embedding)
      VALUES ($1, $2::float8[])
      RETURNING id;
    `;
    
    // Check if the table exists and insert, otherwise throw error
    await pool.query(query, [user_id, embeddingArray]);

    res.json({ success: true, message: 'Face enrolled successfully.' });

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Internal server error during face enrollment.', details: error.message });
  }
});

/**
 * POST /api/face/recognize
 * Body: { image: string (base64) }
 */
router.post('/recognize', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'image is required' });
    }

    // 1. Generate embedding for incoming image
    const incomingEmbedding = await generateEmbedding(image);

    if (!incomingEmbedding) {
      // Return a 200 with matched false instead of an error so the UI can gracefully show "No face" or ignore
      return res.json({ matched: false, user_id: null, message: 'No face detected.' });
    }

    // 2. Fetch all embeddings from DB
    // Ideally we should use pgvector for large datasets, but JS matching is requested here or SQL
    const dbResult = await pool.query('SELECT user_id, embedding FROM face_embeddings');
    const storedEmbeddings = dbResult.rows;

    if (storedEmbeddings.length === 0) {
      return res.json({ matched: false, user_id: null, message: 'No stored faces.' });
    }

    let bestMatchUserId = null;
    let highestConfidence = 0;
    const THRESHOLD = 0.75; // Standard threshold for FaceNet/MobileNet

    // 3. Compare using cosine similarity
    for (const record of storedEmbeddings) {
      const storedVec = record.embedding;
      const score = cosineSimilarity(incomingEmbedding, storedVec);

      if (score > highestConfidence) {
        highestConfidence = score;
        bestMatchUserId = record.user_id;
      }
    }

    // 4. Return the result
    if (highestConfidence >= THRESHOLD && bestMatchUserId !== null) {
      return res.json({
        matched: true,
        user_id: bestMatchUserId,
        confidence: highestConfidence
      });
    } else {
      return res.json({
        matched: false,
        user_id: null,
        confidence: highestConfidence,
        message: 'Unknown user'
      });
    }

  } catch (error) {
    console.error('Recognition error:', error);
    res.status(500).json({ error: 'Internal server error during face recognition.', details: error.message });
  }
});

export default router;
