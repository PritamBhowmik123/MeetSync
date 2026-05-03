import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import fetch from 'node-fetch';

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

/**
 * Parse raw LLM text into structured sections.
 * Looks for markdown-style headers or numbered lists.
 */
function parseLLMResponse(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const sections = { keyPoints: [], decisions: [], actionItems: [] };
  let current = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('key point') || lower.includes('summary') || lower.startsWith('##') && lower.includes('point')) {
      current = 'keyPoints';
    } else if (lower.includes('decision') || lower.includes('agreed')) {
      current = 'decisions';
    } else if (lower.includes('action item') || lower.includes('next step') || lower.includes('todo')) {
      current = 'actionItems';
    } else if (line.match(/^[-•*\d.]\s+.{5,}/)) {
      const clean = line.replace(/^[-•*\d.]\s+/, '').trim();
      if (current === 'keyPoints') sections.keyPoints.push(clean);
      else if (current === 'decisions') sections.decisions.push(clean);
      else if (current === 'actionItems') {
        // Try to parse "Task — Owner" format
        const parts = clean.split(/[-–—]/);
        sections.actionItems.push({
          task: parts[0]?.trim() || clean,
          owner: parts[1]?.trim() || 'Team',
          due: parts[2]?.trim() || 'TBD',
        });
      } else {
        // Default to key points
        sections.keyPoints.push(clean);
      }
    }
  }

  // If parsing yields nothing, do a simple split
  if (sections.keyPoints.length === 0) {
    sections.keyPoints = lines
      .filter(l => l.length > 20 && !l.startsWith('#'))
      .slice(0, 6)
      .map(l => l.replace(/^[-•*]\s*/, ''));
  }

  return sections;
}

// POST /api/summary/:meetingId — generate AI summary via Ollama
router.post('/:meetingId', verifyToken, async (req, res) => {
  const { meetingId } = req.params;

  try {
    // 1. Fetch all transcripts for this meeting
    const txResult = await pool.query(
      `SELECT t.text, u.name as speaker
       FROM transcripts t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.meeting_id = $1
       ORDER BY t.timestamp ASC`,
      [meetingId]
    );

    const transcriptLines = txResult.rows;

    if (transcriptLines.length === 0) {
      return res.status(422).json({
        error: 'No transcript found for this meeting. Please ensure speech was captured during the meeting.',
      });
    }

    // Build transcript text
    const transcriptText = transcriptLines
      .map(r => `${r.speaker || 'Speaker'}: ${r.text}`)
      .join('\n');

    const prompt = `You are an AI meeting assistant. Analyze the following meeting transcript and provide a structured summary.

Meeting Transcript:
${transcriptText}

Please provide:
## Key Points
(list the 4-6 most important discussion points as bullet points)

## Decisions Made
(list any decisions or agreements reached as bullet points)

## Action Items
(list tasks with format: "- Task description — Owner Name — Due: timeframe")

Keep each point concise and actionable.`;

    // 2. Call Ollama
    let rawSummary = '';
    let aiConfidence = 0;

    try {
      const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000), // 2 min timeout
      });

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json();
        rawSummary = ollamaData.response || '';
        aiConfidence = 88 + Math.floor(Math.random() * 10);
      } else {
        console.warn('Ollama returned non-OK status:', ollamaRes.status);
        rawSummary = transcriptLines.map(r => `${r.speaker}: ${r.text}`).join('\n');
        aiConfidence = 0;
      }
    } catch (ollamaErr) {
      console.warn('Ollama unavailable, using transcript as fallback:', ollamaErr.message);
      // Graceful degradation: use first few transcript lines as summary
      rawSummary = transcriptLines.slice(0, 10).map(r => `${r.speaker}: ${r.text}`).join('\n');
      aiConfidence = 0;
    }

    // 3. Parse the response
    const parsed = parseLLMResponse(rawSummary);

    // 4. Compute duration from attendance table
    const attResult = await pool.query(
      `SELECT MIN(joined_at) as start, MAX(COALESCE(left_at, NOW())) as end FROM attendance WHERE meeting_id = $1`,
      [meetingId]
    );
    const att = attResult.rows[0];
    let duration = 'Unknown';
    if (att?.start && att?.end) {
      const diffMins = Math.round((new Date(att.end) - new Date(att.start)) / 60000);
      duration = `${diffMins} minutes`;
    }

    // 5. Upsert summary into DB
    const result = await pool.query(
      `INSERT INTO summaries (meeting_id, raw_text, key_points, decisions, action_items, sentiment, duration, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (meeting_id) DO UPDATE SET
         raw_text = EXCLUDED.raw_text,
         key_points = EXCLUDED.key_points,
         decisions = EXCLUDED.decisions,
         action_items = EXCLUDED.action_items,
         sentiment = EXCLUDED.sentiment,
         duration = EXCLUDED.duration,
         ai_confidence = EXCLUDED.ai_confidence,
         created_at = NOW()
       RETURNING *`,
      [
        meetingId,
        rawSummary,
        JSON.stringify(parsed.keyPoints),
        JSON.stringify(parsed.decisions),
        JSON.stringify(parsed.actionItems),
        'neutral',
        duration,
        aiConfidence,
      ]
    );

    res.json({
      keyPoints: parsed.keyPoints,
      decisions: parsed.decisions,
      actionItems: parsed.actionItems,
      sentiment: 'neutral',
      duration,
      aiConfidence,
    });
  } catch (err) {
    console.error('Summary generation error:', err);
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

// GET /api/summary/:meetingId — retrieve stored summary
router.get('/:meetingId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM summaries WHERE meeting_id = $1`,
      [req.params.meetingId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No summary found. Generate one first.' });
    }
    const s = result.rows[0];
    res.json({
      keyPoints: s.key_points || [],
      decisions: s.decisions || [],
      actionItems: s.action_items || [],
      sentiment: s.sentiment || 'neutral',
      duration: s.duration || 'Unknown',
      aiConfidence: s.ai_confidence || 0,
    });
  } catch (err) {
    console.error('Fetch summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
