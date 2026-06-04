/* global process */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchLegalDatabase } from '../src/utils/legalSearch.js';

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
  questions: [],
  articles: []
};

// Seed helper to populate analytics dashboard with realistic historical data on first run
function seedAnalytics() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Seed articles (2 sample legal guides)
  analyticsData.articles.push({
    id: 'art_seed_1',
    title: 'Governor’s Power to Revoke Certificate of Occupancy',
    subtitle: 'An analysis of Section 28 Land Use Act revocation criteria and compensation rights.',
    thumbnail: 'property', 
    content: `Under Section 28 of the Land Use Act of 1978, the Governor of a State in Nigeria holds the power to revoke a Right of Occupancy (C of O) for 'overriding public interest'. 

However, this power is not absolute. The Act mandates that:
1. **Public Purpose**: The revocation must be for a genuine public purpose (e.g. building roads, schools, hospitals, or extracting minerals).
2. **Proper Notice**: The holder must be served a valid, formal notice of revocation.
3. **Compensation**: The holder is constitutionally and statutorily entitled to fair compensation for the value of their unexhausted improvements (buildings, crops, installations) on the land.

If you receive a revocation notice, it is crucial to verify the notice was served appropriately and that the government’s purpose matches legal definitions before negotiating compensation valuation.`,
    audience: 'all',
    timestamp: now - 5 * oneDay
  });

  analyticsData.articles.push({
    id: 'art_seed_2',
    title: 'Your Fundamental Rights During A Police Arrest',
    subtitle: 'Know your rights under Section 34 & 35 of the 1999 Constitution (as amended).',
    thumbnail: 'rights',
    content: `The 1999 Constitution of Nigeria protects your personal liberty and human dignity. If you are stopped or arrested by law enforcement, remember these critical safeguards:

- **Right to Silence (Sec 35(2))**: You have the right to remain silent and refuse to answer questions until you consult a lawyer.
- **Dignity of Person (Sec 34)**: You must not be subjected to torture, cruel, or inhuman treatment.
- **Bail is Free**: Under Nigerian law, bail is officially free. Holding a suspect beyond 24-48 hours without bringing them before a court of competent jurisdiction is a constitutional violation.
- **Right to be Informed (Sec 35(3))**: You must be informed immediately, in the language you understand, of the reason for your arrest.

Always remain calm and professional, ask to contact your legal counsel immediately, and avoid signing any statement without a lawyer present.`,
    audience: 'subscribed',
    timestamp: now - 2 * oneDay
  });
}

// Load analytics database from disk or seed it if missing
function loadAnalytics() {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
      analyticsData = JSON.parse(raw);
      console.log('📊 Loaded analytics database successfully.');
      
      // Safety checks for new properties
      if (!analyticsData.articles) {
        analyticsData.articles = [];
      }
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
function normalizeGeminiApiKey(value) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

const apiKey = normalizeGeminiApiKey(process.env.GEMINI_API_KEY);
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const geminiFallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';
let genAI = null;

if (apiKey) {
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

async function generateGeminiText(prompt) {
  const modelNames = [...new Set([geminiModel, geminiFallbackModel])];
  let lastError = null;

  function shouldTryNextModel(err) {
    const message = err?.message || '';
    const status = err?.status || err?.statusCode;
    return [404, 429, 500, 502, 503, 504].includes(status) || /not found|not supported|high demand|overloaded|temporarily unavailable/i.test(message);
  }

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastError = err;
      if (!shouldTryNextModel(err)) {
        throw err;
      }
      console.warn(`⚠️ Gemini model "${modelName}" unavailable. Trying fallback model if configured...`);
    }
  }

  throw lastError;
}

const jurisdictionRule = `Jurisdiction rule:
- First check whether the user mentioned a Nigerian state, Abuja/FCT, a geopolitical region, or a local authority in the current message or earlier turns in this same chat.
- If the current message mentions a state, FCT, region, or local authority, treat that as the active jurisdiction and answer under that jurisdiction's law where relevant.
- If the current message does not mention a new jurisdiction but earlier turns in this chat did, continue using the earlier active jurisdiction and say that you are applying it.
- If no state or region is known and the answer can differ by state, say clearly that state law may differ, give the general Nigerian/federal position, mention any relevant state-specific examples you know from reliable law or the retrieved materials, and ask the user to provide the state for a more precise answer.
- For topics that often differ by state or region, such as tenancy, limitation/adverse possession, probate and inheritance, customary marriage, road traffic/towing rules, criminal code/penal code differences, land procedures, taxes, and local government rules, include a short jurisdiction note before the conclusion.
- If several states have different rules for the same issue and you know the difference from the retrieved materials or reliable general knowledge, compare them briefly. Do not invent state laws, penalties, deadlines, or section numbers.`;

const jurisdictionPatterns = [
  ['Abia State', /\babia\b/i],
  ['Adamawa State', /\badamawa\b/i],
  ['Akwa Ibom State', /\bakwa[\s-]?ibom\b/i],
  ['Anambra State', /\banambra\b/i],
  ['Bauchi State', /\bbauchi\b/i],
  ['Bayelsa State', /\bbayelsa\b/i],
  ['Benue State', /\bbenue\b/i],
  ['Borno State', /\bborno\b/i],
  ['Cross River State', /\bcross[\s-]?river\b/i],
  ['Delta State', /\bdelta\b/i],
  ['Ebonyi State', /\bebonyi\b/i],
  ['Edo State', /\bedo\b/i],
  ['Ekiti State', /\bekiti\b/i],
  ['Enugu State', /\benugu\b/i],
  ['Federal Capital Territory (Abuja)', /\b(fct|f\.c\.t\.|abuja|federal capital territory)\b/i],
  ['Gombe State', /\bgombe\b/i],
  ['Imo State', /\bimo\b/i],
  ['Jigawa State', /\bjigawa\b/i],
  ['Kaduna State', /\bkaduna\b/i],
  ['Kano State', /\bkano\b/i],
  ['Katsina State', /\bkatsina\b/i],
  ['Kebbi State', /\bkebbi\b/i],
  ['Kogi State', /\bkogi\b/i],
  ['Kwara State', /\bkwara\b/i],
  ['Lagos State', /\blagos\b/i],
  ['Nasarawa State', /\b(nasarawa|nassarawa)\b/i],
  ['Niger State', /\bniger state\b/i],
  ['Ogun State', /\bogun\b/i],
  ['Ondo State', /\bondo\b/i],
  ['Osun State', /\bosun\b/i],
  ['Oyo State', /\boyo\b/i],
  ['Plateau State', /\bplateau\b/i],
  ['Rivers State', /\brivers\b/i],
  ['Sokoto State', /\bsokoto\b/i],
  ['Taraba State', /\btaraba\b/i],
  ['Yobe State', /\byobe\b/i],
  ['Zamfara State', /\bzamfara\b/i],
  ['South East Nigeria', /\b(south[\s-]?east|southeastern nigeria|igbo land|igboland)\b/i],
  ['South South Nigeria', /\b(south[\s-]?south|niger delta)\b/i],
  ['South West Nigeria', /\b(south[\s-]?west|southwestern nigeria|yoruba land|yorubaland)\b/i],
  ['North Central Nigeria', /\b(north[\s-]?central|middle belt)\b/i],
  ['North East Nigeria', /\b(north[\s-]?east|northeastern nigeria)\b/i],
  ['North West Nigeria', /\b(north[\s-]?west|northwestern nigeria)\b/i],
  ['Northern Nigeria', /\bnorthern nigeria\b/i],
  ['Southern Nigeria', /\bsouthern nigeria\b/i]
];

function normalizeConversationHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-10)
    .map(item => ({
      role: item.role,
      content: item.content.trim().slice(0, 1200)
    }))
    .filter(item => item.content.length > 0);
}

function detectJurisdictions(text) {
  if (!text) return [];
  const matches = [];

  for (const [label, pattern] of jurisdictionPatterns) {
    if (pattern.test(text) && !matches.includes(label)) {
      matches.push(label);
    }
  }

  return matches;
}

function buildConversationMemory(message, history) {
  const currentJurisdictions = detectJurisdictions(message);
  const previousJurisdictions = [];
  let latestPreviousJurisdiction = '';

  for (const turn of history) {
    const detected = detectJurisdictions(turn.content);
    if (detected.length > 0) {
      latestPreviousJurisdiction = detected[detected.length - 1];
    }
    for (const label of detected) {
      if (!previousJurisdictions.includes(label)) {
        previousJurisdictions.push(label);
      }
    }
  }

  const activeJurisdiction = currentJurisdictions[0] || latestPreviousJurisdiction || '';
  const historyText = history.length
    ? history.map((turn, index) => `${index + 1}. ${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n')
    : 'No earlier turns in this chat.';

  return `Conversation memory:
Use this memory only to understand follow-up questions, earlier facts, parties, dates, locations, and the active jurisdiction. Do not repeat the whole history back to the user.

Previous turns in this same chat:
${historyText}

Jurisdiction memory:
- Current message mentions: ${currentJurisdictions.length ? currentJurisdictions.join(', ') : 'none'}
- Earlier turns mention: ${previousJurisdictions.length ? previousJurisdictions.join(', ') : 'none'}
- Active jurisdiction to apply: ${activeJurisdiction || 'none yet; ask for the state/region if the law may differ'}`;
}

function buildSearchText(message, history) {
  const recentUserContext = history
    .filter(turn => turn.role === 'user')
    .slice(-3)
    .map(turn => turn.content)
    .join('\n');

  return `${recentUserContext}\n${message}`.trim();
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
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if email already registered
    const existing = analyticsData.registrations.find(r => r.email.toLowerCase() === cleanEmail);
    if (!existing) {
      analyticsData.registrations.push({
        email: cleanEmail,
        timestamp: Date.now(),
        subscribed: true // Default to opt-in for first login
      });
    } else {
      existing.timestamp = Date.now(); // Update last active timestamp
    }
    saveAnalytics();
  }
  res.json({ success: true });
});

// Update client newsletter subscription opt-in
app.post('/api/analytics/subscribe', (req, res) => {
  const { email, subscribed } = req.body;
  if (email && email.trim() !== '') {
    const cleanEmail = email.trim().toLowerCase();
    const existing = analyticsData.registrations.find(r => r.email.toLowerCase() === cleanEmail);
    
    if (existing) {
      existing.subscribed = !!subscribed;
      console.log(`🔔 Subscription status updated for ${cleanEmail}: ${existing.subscribed}`);
    } else {
      analyticsData.registrations.push({
        email: cleanEmail,
        timestamp: Date.now(),
        subscribed: !!subscribed
      });
    }
    saveAnalytics();
  }
  res.json({ success: true });
});

// Fetch all articles
app.get('/api/articles', (req, res) => {
  const list = [...(analyticsData.articles || [])].sort((a, b) => b.timestamp - a.timestamp);
  res.json({ success: true, articles: list });
});

// Publish Article & Simulate Email Dispatch Endpoint
app.post('/api/admin/publish-article', (req, res) => {
  const { email, password, title, subtitle, thumbnail, content, audience } = req.body;

  if (email === 'midlexllp01@gmail.com' && password === 'Admin@123') {
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and Content are required.' });
    }

    // Create article object
    const newArticle = {
      id: `art_${Date.now()}`,
      title: title.trim(),
      subtitle: (subtitle || '').trim(),
      thumbnail: thumbnail || 'scale',
      content: content.trim(),
      audience: audience || 'all',
      timestamp: Date.now()
    };

    if (!analyticsData.articles) {
      analyticsData.articles = [];
    }
    analyticsData.articles.push(newArticle);
    saveAnalytics();

    // Determine recipient emails
    const targetEmails = audience === 'all'
      ? analyticsData.registrations.map(r => r.email)
      : analyticsData.registrations
          .filter(r => r.subscribed === true)
          .map(r => r.email);

    // Deduplicate emails
    const uniqueRecipients = [...new Set(targetEmails.map(e => e.toLowerCase()))];

    // Log the simulation of SMTP dispatching
    console.log(`\n📧 ===== EMAIL DISPATCH SIMULATION START =====`);
    console.log(`📝 Newsletter Article: "${title}"`);
    console.log(`👥 Target Group Filter: ${audience === 'all' ? 'All Registered Clients' : 'Subscribed Clients Only'}`);
    console.log(`✉️ Dispatching to ${uniqueRecipients.length} client email(s)...`);
    
    uniqueRecipients.forEach(emailAddr => {
      console.log(`   👉 [DISPATCHED] To: ${emailAddr} | Subject: [Midlex LLP] ${title}`);
    });
    console.log(`📧 ===== EMAIL DISPATCH SIMULATION COMPLETE =====\n`);

    return res.json({
      success: true,
      article: newArticle,
      recipientsCount: uniqueRecipients.length
    });
  } else {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
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

    // Historical articles list
    const articles = [...(analyticsData.articles || [])].sort((a, b) => b.timestamp - a.timestamp);

    return res.json({
      success: true,
      stats: {
        registeredCount,
        visitsToday,
        visitsThisWeek,
        visitsThisMonth,
        topQuestions,
        registrations: registrations.slice(0, 30), // Return last 30 registration activities
        articles: articles // History of published updates
      }
    });
  } else {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
});

// Chat API Endpoint with RAG Flow
app.post('/api/chat', async (req, res) => {
  const { message, conversationHistory } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required.' });
  }

  const cleanMessage = message.trim();
  const normalizedHistory = normalizeConversationHistory(conversationHistory);
  const conversationMemory = buildConversationMemory(cleanMessage, normalizedHistory);
  const searchText = buildSearchText(cleanMessage, normalizedHistory);

  console.log(`💬 User Query: "${cleanMessage}"`);

  // Log user question into analytics database
  analyticsData.questions.push({
    text: cleanMessage,
    timestamp: Date.now()
  });
  saveAnalytics();

  // Step 1: Query local database to retrieve matching legal sections
  const localMatch = searchLegalDatabase(searchText);

  if (!genAI) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
      engine: 'gemini'
    });
  }

  // If local match is a simple greeting or default helper message without sources
  if (!localMatch.sources || localMatch.sources.length === 0) {
    // If Gemini is active, let Gemini reply directly in character
    if (genAI) {
      try {
        console.log('🤖 Querying Gemini for direct general greeting/helper reply...');
        const systemPrompt = `You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System.
The user sent a message or asked a question: "${cleanMessage}".

${conversationMemory}

Please respond in character as a professional legal counsel:
1. If the message is a general greeting or introduction, introduce yourself and explain what you can do (e.g., answering questions on the Constitution, Land Use Act, Criminal Code, and Electoral Act 2022).
2. If the user is asking a specific legal question (e.g., about a car accident, vehicle towing, contracts, family law, etc.), please answer their question directly, thoroughly, and professionally using your general knowledge of the Nigerian Legal System (e.g., relevant tort principles, state traffic laws, etc.).
3. Keep the tone helpful, professional, and authoritative.
4. Apply this rule in every answer:
${jurisdictionRule}
5. Always end with a short final summary headed exactly **In conclusion:** that directly answers the user's question and gives the safest next step.
6. CRITICAL: Do NOT use robotic phrases such as "Based on the provided context...", "According to the context...", "There is no information in the context...", "The database does not contain...". Do NOT mention database limitations, missing files, or reference contexts. Speak naturally as an expert lawyer who knows the law.`;

        const generatedText = await generateGeminiText(systemPrompt);
        
        return res.json({
          answerText: generatedText,
          sources: [],
          reasoning: [],
          engine: 'gemini'
        });
      } catch (err) {
        console.error('❌ Gemini direct reply failed:', err.message);
        return res.status(502).json({
          error: err.message || 'Gemini direct reply failed.',
          engine: 'gemini'
        });
      }
    } else {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        engine: 'gemini'
      });
    }
  }

  // Step 2: If we have legal sources and Gemini is active, execute RAG flow
  if (genAI) {
    try {
      console.log(`📚 Found ${localMatch.sources.length} matching legal provision(s). Initiating Gemini RAG flow...`);
      // Grounding context construction
      const contextText = localMatch.sources.map((s, idx) => {
        return `[SOURCE ${idx + 1}]: ${s.act} - ${s.section} (Titled: "${s.title}")
Chapter/Part: ${s.chapter || ""} / ${s.part || ""}
Official Text: "${s.content}"
Standard Rationale: ${s.reasoning || ""}
Reference: ${s.sourcePage || "Registry source"}${s.sourceUrl ? ` - ${s.sourceUrl}` : ""}`;
      }).join('\n\n');

      const systemPrompt = `You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System.
Your job is to explain the law to the user in a professional, clear, and objective tone.
You must ground your explanation primarily in the provided Nigerian legal sections below.

Official Nigerian Legal Provisions to ground your response:
===
${contextText}
===

Current User's Question: "${cleanMessage}"

${conversationMemory}

Instructions:
1. Explain how these specific sections apply to the user's question.
2. Quote or reference specific sections (e.g. **Section 34 of the Constitution** or **Section 1 of the Land Use Act**) directly to back up your points.
3. Keep the explanation readable and highly structured. Use paragraphs and bullet points.
4. Maintain a professional, objective, and authoritative tone suitable for legal assistance.
5. Apply this rule in every answer:
${jurisdictionRule}
6. If the provided legal sections do not fully cover the answer, you may supplement it with your general knowledge of the Nigerian legal system.
7. Do not invent procedural dates, waiting periods, filing deadlines, penalties, or court requirements unless they are present in the provided sources. If a detail is not in the sources, say that the user should confirm it from the court record or current rules.
8. Always end with a short final summary headed exactly **In conclusion:** that directly answers the user's question and gives the safest next step.
9. CRITICAL: Do NOT use robotic phrases such as "Based on the provided context...", "According to the context...", "There is no information in the context...", "The database does not contain...". Do NOT mention database limitations, missing files, or reference contexts. Speak naturally as an expert lawyer who knows the law.`;

      const explanation = await generateGeminiText(systemPrompt);

      console.log('✅ Gemini RAG explanation generated successfully.');

      return res.json({
        answerText: explanation,
        sources: localMatch.sources,
        reasoning: localMatch.reasoning,
        engine: 'gemini'
      });

    } catch (err) {
      console.error('❌ Gemini RAG call failed:', err.message);
      return res.status(502).json({
        error: err.message || 'Gemini RAG call failed.',
        engine: 'gemini'
      });
    }
  } else {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
      engine: 'gemini'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Midlex AI Backend Server running at http://localhost:${PORT}`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api/chat`);
});
