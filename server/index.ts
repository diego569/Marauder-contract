import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  initDB,
  getClauses,
  createClause,
  updateClause,
  deleteClause,
  createContract,
  saveDraft,
  getContractById,
  getLatestContract,
  deleteAllContracts,
} from './db';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const ADMIN_KEY = process.env.ADMIN_KEY || 'marauder';

app.use(cors());
app.use(express.json({ limit: '10mb' })); // signatures can be large Base64 strings

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    res.status(403).json({ error: 'Forbidden: invalid admin key' });
    return;
  }
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Clauses ──────────────────────────────────────────────────────────────────

app.get('/api/clauses', async (_req, res) => {
  try {
    const clauses = await getClauses();
    res.json(clauses);
  } catch (err) {
    console.error('GET /api/clauses error:', err);
    res.status(500).json({ error: 'Failed to fetch clauses' });
  }
});

app.post('/api/clauses', requireAdmin, async (req, res) => {
  try {
    const { title, text, order } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const clause = await createClause(
      title ? String(title).trim() : '',
      text.trim(),
      typeof order === 'number' ? order : 0
    );
    res.status(201).json(clause);
  } catch (err) {
    console.error('POST /api/clauses error:', err);
    res.status(500).json({ error: 'Failed to create clause' });
  }
});

app.put('/api/clauses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const clause = await updateClause(id, title ? String(title).trim() : '', text.trim());
    if (!clause) {
      res.status(404).json({ error: 'Clause not found' });
      return;
    }
    res.json(clause);
  } catch (err) {
    console.error('PUT /api/clauses/:id error:', err);
    res.status(500).json({ error: 'Failed to update clause' });
  }
});

app.delete('/api/clauses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteClause(id);
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/clauses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete clause' });
  }
});

// ─── Contracts ────────────────────────────────────────────────────────────────

app.post('/api/contracts', async (req, res) => {
  try {
    const { signature1, signature2, clausesSnapshot, draftId } = req.body;
    if (!signature1 || !signature2 || !Array.isArray(clausesSnapshot)) {
      res.status(400).json({ error: 'signature1, signature2, and clausesSnapshot are required' });
      return;
    }
    const contract = await createContract(signature1, signature2, clausesSnapshot, draftId);
    res.status(201).json(contract);
  } catch (err) {
    console.error('POST /api/contracts error:', err);
    res.status(500).json({ error: 'Failed to save contract' });
  }
});

// Save each signature immediately, so a partially signed vow survives reloads.
app.put('/api/contracts/draft', async (req, res) => {
  try {
    const { signature1, signature2, clausesSnapshot } = req.body;
    const validSignature = (signature: unknown) => signature === null || typeof signature === 'string';
    if (!validSignature(signature1) || !validSignature(signature2) || !Array.isArray(clausesSnapshot)) {
      res.status(400).json({ error: 'signatures must be strings or null, and clausesSnapshot is required' });
      return;
    }
    const draft = await saveDraft(signature1, signature2, clausesSnapshot);
    res.json(draft);
  } catch (err) {
    console.error('PUT /api/contracts/draft error:', err);
    res.status(500).json({ error: 'Failed to save contract draft' });
  }
});

app.get('/api/contracts/latest', async (req, res) => {
  try {
    const contract = await getLatestContract();
    if (!contract) {
      res.status(404).json({ error: 'No contracts found' });
      return;
    }
    res.json(contract);
  } catch (err) {
    console.error('GET /api/contracts/latest error:', err);
    res.status(500).json({ error: 'Failed to fetch latest contract' });
  }
});

app.delete('/api/contracts/latest', requireAdmin, async (req, res) => {
  try {
    await deleteAllContracts();
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/contracts/latest error:', err);
    res.status(500).json({ error: 'Failed to delete contracts' });
  }
});

app.get('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await getContractById(id);
    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }
    res.json(contract);
  } catch (err) {
    console.error('GET /api/contracts/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🧙 Marauder's Contract API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
