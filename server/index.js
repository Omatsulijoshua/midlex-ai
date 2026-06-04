import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchLegalDatabase } from './legalSearch.js';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve paths for local file persistence
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

// Middleware
app.use(cors()); // Allow all origins for Render/Vercel deployment
app.use(express.json());

// In-memory analytics database state
let analyticsData = {
  visits: [],
  registrations: [],
  questions: []
};

// Seed helper to populate analytics dashboard with realistic historical data on first run
function seedAnalytics() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Seed visits (around 195 visits spread over 30 days)
  for (let i = 0; i < 195; i++) {
    const daysAgo = Math.pow(Math.random(), 1.6) * 30; // Clustered more towards recent days
    analyticsData.visits.push({
      timestamp: now - (daysAgo * oneDay)
    });
  }

  // Seed registered clients (8 mock bar advocates & clients)
  const mockClients = [
    { email: 'tobias.eze@gmail.com', daysAgo: 14 },
    { email: 'funmi.alao@yahoo.com', daysAgo: 11 },
    { email: 'chidi.okafor@outlook.com', daysAgo: 8 },
    { email: 'amara.kanu@gmail.com', daysAgo: 6 },
    { email: 'ibrahim.musa@lawyer.com', daysAgo: 4 },
    { email: 'segun.odubanjo@midlex.com', daysAgo: 2.5 },
    { email: 'chioma.nwachukwu@bar.ng', daysAgo: 1.2 },
    { email: 'yusuf.bello@court.gov.ng', daysAgo: 0.1 }
  ];

  mockClients.forEach(c => {
    analyticsData.registrations.push({
      email: c.email,
      timestamp: now - (c.daysAgo * oneDay)
    });
  });

  // Seed questions asked historically with realistic legal search phrases
  const seedQuestionsList = [
    "what are my fundamental rights under police arrest?",
    "can the governor revoke my C of O land ownership?",
    "what is the definition and punishment for stealing?",
    "how does the electoral act enforce BVAS usage in voting?",
    "what is the land use act of 1978?",
    "is police bail free in Nigeria?",
    "how to recover a rental property from a tenant?"
  ];

  const frequencies = [28, 19, 14, 11, 8, 6, 3];
  frequencies.forEach((freq, idx) => {
    const qText = seedQuestionsList[idx];
    for (let i = 0; i < freq; i++) {
      const daysAgo = Math.random() * 30;
      analyticsData.questions.push({
        text: qText,
        timestamp: now - (daysAgo * oneDay)
      });
    }
  });
}

// Load analytics database from disk or seed it if missing
function loadAnalytics() {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
      analyticsData = JSON.parse(raw);
      console.log('📊 Loaded analytics database successfully.');
    } else {
      console.log('📊 Analytics file not found. Seeding initial mock database...');
      seedAnalytics();
      saveAnalytics();
    }
  } catch (err) {
    console.error('❌ Failed to load/seed analytics:', err.message);
  }
}

// Save analytics state back to local JSON file
function saveAnalytics() {
  try {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsData, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Failed to save analytics database:', err.message);
  }
}

// Load database immediately on startup
loadAnalytics();

// Health Check Route for Render
app.get('/', (req, res) => {
  res.send('Midlex AI Backend API is running successfully.');
});

// Initialize Google Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (apiKey && apiKey.trim() !== '') {
  console.log('✅ Gemini API Key detected. Initializing Google Gen AI SDK...');
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (err) {
    console.error('❌ Failed to initialize Google Gen AI SDK:', err.message);
  }
} else {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not defined.');
  console.warn('⚠️ Server will operate in Offline Fallback Mode, returning pre-authored database answers.');
}

// Track page visit (Pinged by client session storage)
app.post('/api/analytics/visit', (req, res) => {
  analyticsData.visits.push({
    timestamp: Date.now()
  });
  saveAnalytics();
  res.json({ success: true });
});

// Track registered user sign-in
app.post('/api/analytics/register', (req, res) => {
  const { email } = req.body;
  if (email && email.trim() !== '') {
    // Avoid duplicating same client registration within short periods; log entry
    analyticsData.registrations.push({
      email: email.trim(),
      timestamp: Date.now()
    });
    saveAnalytics();
  }
  res.json({ success: true });
});

// Admin Login & Stats Calculator Endpoint
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'midlexllp01@gmail.com' && password === 'Admin@123') {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Calculate views over dynamic timeframes
    const visitsToday = analyticsData.visits.filter(v => v.timestamp > now - oneDay).length;
    const visitsThisWeek = analyticsData.visits.filter(v => v.timestamp > now - 7 * oneDay).length;
    const visitsThisMonth = analyticsData.visits.filter(v => v.timestamp > now - 30 * oneDay).length;

    // Registered clients
    const registrations = [...analyticsData.registrations].sort((a, b) => b.timestamp - a.timestamp);
    const registeredCount = new Set(registrations.map(r => r.email)).size;

    // Top questions count
    const questionCounts = {};
    analyticsData.questions.forEach(q => {
      const txt = q.text.trim();
      if (txt) {
        questionCounts[txt] = (questionCounts[txt] || 0) + 1;
      }
    });

    const topQuestions = Object.entries(questionCounts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Show top 15 questions

    return res.json({
      success: true,
      stats: {
        registeredCount,
        visitsToday,
        visitsThisWeek,
        visitsThisMonth,
        topQuestions,
        registrations: registrations.slice(0, 30) // Return last 30 registration activities
      }
    });
  } else {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
});

// Chat API Endpoint with RAG Flow
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required.' });
  }

  console.log(`💬 User Query: "${message}"`);

  // Log user question into analytics database
  analyticsData.questions.push({
    text: message.trim(),
    timestamp: Date.now()
  });
  saveAnalytics();

  // Step 1: Query local database to retrieve matching legal sections
  const localMatch = searchLegalDatabase(message);

  // If local match is a simple greeting or default helper message without sources
  if (!localMatch.sources || localMatch.sources.length === 0) {
    // If Gemini is active, let Gemini reply directly in character
    if (genAI) {
      try {
        console.log('🤖 Querying Gemini for direct general greeting/helper reply...');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = `You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System.
The user sent a message: "${message}".
Please respond in character, introducing yourself if they said hello, or explaining what you can do (e.g. answering questions on the Constitution, Land Use Act, Criminal Code, and Electoral Act 2022). Keep the tone helpful, professional, and authoritative.`;

        const result = await model.generateContent(systemPrompt);
        const generatedText = result.response.text();
        
        return res.json({
          answerText: generatedText,
          sources: [],
          reasoning: []
        });
      } catch (err) {
        console.error('❌ Gemini direct reply failed, falling back to offline reply:', err.message);
        return res.json(localMatch);
      }
    } else {
      // Fallback directly to offline reply
      return res.json(localMatch);
    }
  }

  // Step 2: If we have legal sources and Gemini is active, execute RAG flow
  if (genAI) {
    try {
      console.log(`📚 Found ${localMatch.sources.length} matching legal provision(s). Initiating Gemini RAG flow...`);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Grounding context construction
      const contextText = localMatch.sources.map((s, idx) => {
        return `[SOURCE ${idx + 1}]: ${s.act} - ${s.section} (Titled: "${s.title}")
Chapter/Part: ${s.chapter || ""} / ${s.part || ""}
Official Text: "${s.content}"
Standard Rationale: ${s.reasoning || ""}`;
      }).join('\n\n');

      const systemPrompt = `You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System.
Your job is to explain the law to the user in a professional, clear, and objective tone.
You must ground your explanation primarily in the provided Nigerian legal sections below.

Official Nigerian Legal Provisions to ground your response:
===
${contextText}
===

User's Question: "${message}"

Instructions:
1. Explain how these specific sections apply to the user's question.
2. Quote or reference specific sections (e.g. **Section 34 of the Constitution** or **Section 1 of the Land Use Act**) directly to back up your points.
3. Keep the explanation readable and highly structured. Use paragraphs and bullet points.
4. Maintain a professional, objective, and authoritative tone suitable for legal assistance.
5. If the provided legal sections do not fully cover the answer, you may supplement it with your general knowledge of the Nigerian legal system, but clearly state that it is general legal information and not explicitly cited in the provided documents.`;

      const result = await model.generateContent(systemPrompt);
      const explanation = result.response.text();

      console.log('✅ Gemini RAG explanation generated successfully.');

      return res.json({
        answerText: explanation,
        sources: localMatch.sources,
        reasoning: localMatch.reasoning
      });

    } catch (err) {
      console.error('❌ Gemini RAG call failed. Falling back to offline match engine. Error:', err.message);
      // Fallback to local match engine text response
      return res.json(localMatch);
    }
  } else {
    // Return offline response if Gemini is not configured
    console.log('🔌 No Gemini API configured. Returning local offline match results.');
    return res.json(localMatch);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Midlex AI Backend Server running at http://localhost:${PORT}`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api/chat`);
});
