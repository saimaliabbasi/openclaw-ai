/* ═══════════════════════════════════════════
   OpenClaw — Express Server
   ═══════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { runOrchestrator, generateEmailTemplate } = require('./ai');
const { generateExcel } = require('./tools/excel');
const { sendBulkEmails } = require('./tools/email');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API: Status Check ───
app.get('/api/status', (req, res) => {
  res.json({
    groq:   !!process.env.GROQ_API_KEY   && process.env.GROQ_API_KEY   !== 'your_free_groq_api_key_here',
    tavily: !!process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== 'your_free_tavily_api_key_here',
    gmail:  !!process.env.GMAIL_USER     && process.env.GMAIL_USER     !== 'your_email@gmail.com' && process.env.GMAIL_APP_PASSWORD !== 'your_16_char_app_password'
  });
});

// ─── API: Research (Orchestrator) ───
app.post('/api/research', async (req, res) => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_free_groq_api_key_here') {
    return res.status(401).json({ error: 'Groq API Key is missing. Please click Setup API Keys.' });
  }
  if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === 'your_free_tavily_api_key_here') {
    return res.status(401).json({ error: 'Tavily API Key is missing. Please click Setup API Keys.' });
  }

  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    console.log(`\n[Server] New research request: "${query}"`);
    const leads = await runOrchestrator(query);
    
    // Save to database
    saveToDatabase(leads);

    res.json({ leads });
  } catch (err) {
    console.error('[Server Error]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─── API: Export Excel ───
app.post('/api/export', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !Array.isArray(leads)) return res.status(400).json({ error: 'Leads array required' });

    console.log(`[Server] Generating Excel for ${leads.length} leads`);
    const buffer = generateExcel(leads);

    res.setHeader('Content-Disposition', 'attachment; filename="openclaw_leads.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('[Export Error]', err);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

// ─── API: Generate Email (AI) ───
app.post('/api/generate-email', async (req, res) => {
  try {
    const { leads } = req.body;
    const template = await generateEmailTemplate(leads);
    res.json(template);
  } catch (err) {
    console.error('[Email Gen Error]', err);
    res.status(500).json({ error: 'Failed to generate email template' });
  }
});

// ─── API: Send Emails ───
app.post('/api/email', async (req, res) => {
  try {
    const { leads, subject, body } = req.body;
    if (!leads || !subject || !body) return res.status(400).json({ error: 'Missing required fields' });

    console.log(`[Server] Sending ${leads.length} emails`);
    const results = await sendBulkEmails(leads, subject, body);
    
    const sentCount = results.filter(r => r.success).length;
    res.json({ sent: sentCount, results });
  } catch (err) {
    console.error('[Email Error]', err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

// ─── DB Helper ───
function saveToDatabase(newLeads) {
  try {
    const dbPath = path.join(__dirname, '../database/leads.json');
    let db = { leads: [], totalSearches: 0 };
    
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
    
    db.leads = [...newLeads, ...db.leads].slice(0, 500); // Keep last 500
    db.totalSearches += 1;
    db.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Database write error:', err.message);
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`
  ===========================================
  🚀 OpenClaw Server running on port ${PORT}
  👉 http://localhost:${PORT}
  ===========================================
  `);
});
