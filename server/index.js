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

function createAnalyticsId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanString(value, maxLength = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeEmail(value) {
  return cleanString(value, 180).toLowerCase();
}

function normalizeUserPayload(user = {}) {
  const safeUser = user && typeof user === 'object' ? user : {};
  return {
    id: cleanString(safeUser.id || safeUser.userId, 120),
    email: normalizeEmail(safeUser.email),
    name: cleanString(safeUser.name || safeUser.displayName, 120)
  };
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

function normalizeAnalyticsCategory(category) {
  const value = cleanString(category, 120).toLowerCase();

  if (!value) return '';
  if (/succession|inheritance|estate|probate|intestate|customary/.test(value)) return 'Succession & Inheritance';
  if (/family|matrimonial|marriage|divorce|custody|maintenance/.test(value)) return 'Family Law';
  if (/land|property|occupancy|lease|tenan|rent|house/.test(value)) return 'Land & Property';
  if (/criminal|penal|crime|offence|offense/.test(value)) return 'Criminal Law';
  if (/right|constitution|liberty|detention|police|bail|fair hearing/.test(value)) return 'Fundamental Rights';
  if (/traffic|road|vehicle|tow|towing|accident|collision/.test(value)) return 'Road Traffic';
  if (/animal|cruelty|dog|pet|livestock/.test(value)) return 'Animal Cruelty';
  if (/election|electoral|bvas|inec/.test(value)) return 'Elections';

  return category || 'General Nigerian Law';
}

function categorizeQuestion(text, localMatch = {}) {
  const sourceCategory = (localMatch.sources || [])
    .map(source => normalizeAnalyticsCategory(source.category || source.act || source.title))
    .find(Boolean);

  if (sourceCategory) return sourceCategory;

  const value = cleanString(text, 1200).toLowerCase();

  if (/succession|inherit|estate|probate|intestate|will|first son|eldest|family property|share property|father died|dad died/.test(value)) {
    return 'Succession & Inheritance';
  }
  if (/marry|marriage|divorce|custody|maintenance|wife|husband|spouse|child support|forced marriage|remarry/.test(value)) {
    return 'Family Law';
  }
  if (/land|property|house|tenant|landlord|rent|lease|certificate of occupancy|c of o|governor revoke|adverse possession|squat|living there/.test(value)) {
    return 'Land & Property';
  }
  if (/car|vehicle|road|traffic|tow|towed|towing|accident|collision|jammed|hit from|lastma|vio|parking/.test(value)) {
    return 'Road Traffic';
  }
  if (/dog|animal|pet|chicken|livestock|cruelty|poison/.test(value)) {
    return 'Animal Cruelty';
  }
  if (/election|electoral|bvas|inec|vote|polling|candidate/.test(value)) {
    return 'Elections';
  }
  if (/arrest|police|bail|detention|liberty|fundamental right|human right|torture|fair hearing/.test(value)) {
    return 'Fundamental Rights';
  }
  if (/steal|theft|murder|kill|assault|fraud|criminal|crime|offence|offense|punishment/.test(value)) {
    return 'Criminal Law';
  }

  return 'General Nigerian Law';
}

function ensureAnalyticsShape() {
  analyticsData.visits = Array.isArray(analyticsData.visits) ? analyticsData.visits : [];
  analyticsData.registrations = Array.isArray(analyticsData.registrations) ? analyticsData.registrations : [];
  analyticsData.questions = Array.isArray(analyticsData.questions) ? analyticsData.questions : [];
  analyticsData.articles = Array.isArray(analyticsData.articles) ? analyticsData.articles : [];

  analyticsData.registrations = analyticsData.registrations.map(reg => {
    const timestamp = Number(reg.timestamp || reg.firstSeen || reg.lastSeen || Date.now());
    return {
      ...reg,
      email: normalizeEmail(reg.email),
      userId: cleanString(reg.userId || reg.id, 120),
      name: cleanString(reg.name, 120),
      timestamp,
      firstSeen: Number(reg.firstSeen || timestamp),
      lastSeen: Number(reg.lastSeen || timestamp),
      visitCount: Number(reg.visitCount || 0),
      questionCount: Number(reg.questionCount || 0),
      categoryCounts: reg.categoryCounts && typeof reg.categoryCounts === 'object' ? reg.categoryCounts : {},
      searchHistory: Array.isArray(reg.searchHistory) ? reg.searchHistory.slice(0, 25) : []
    };
  }).filter(reg => reg.email);

  analyticsData.questions = analyticsData.questions.map(question => ({
    ...question,
    id: question.id || createAnalyticsId('q'),
    text: cleanString(question.text, 1200),
    timestamp: Number(question.timestamp || Date.now()),
    category: question.category || categorizeQuestion(question.text),
    email: normalizeEmail(question.email),
    userId: cleanString(question.userId, 120),
    userName: cleanString(question.userName, 120),
    chatId: cleanString(question.chatId, 120),
    sessionId: cleanString(question.sessionId, 120),
    sourceCategories: Array.isArray(question.sourceCategories) ? question.sourceCategories : []
  })).filter(question => question.text);

  rebuildRegistrationSearchStats();
}

function upsertRegistration(user, updates = {}) {
  const normalized = normalizeUserPayload(user);
  if (!normalized.email) return null;

  let existing = analyticsData.registrations.find(reg => reg.email === normalized.email);
  const now = Date.now();

  if (!existing) {
    existing = {
      email: normalized.email,
      userId: normalized.id,
      name: normalized.name,
      timestamp: now,
      firstSeen: now,
      lastSeen: now,
      subscribed: true,
      visitCount: 0,
      questionCount: 0,
      categoryCounts: {},
      searchHistory: []
    };
    analyticsData.registrations.push(existing);
  }

  existing.userId = normalized.id || existing.userId || '';
  existing.name = normalized.name || existing.name || '';
  existing.timestamp = now;
  existing.lastSeen = now;
  existing.firstSeen = existing.firstSeen || now;
  existing.visitCount = Number(existing.visitCount || 0);
  existing.questionCount = Number(existing.questionCount || 0);
  existing.categoryCounts = existing.categoryCounts && typeof existing.categoryCounts === 'object'
    ? existing.categoryCounts
    : {};
  existing.searchHistory = Array.isArray(existing.searchHistory) ? existing.searchHistory : [];

  if (typeof updates.subscribed === 'boolean') {
    existing.subscribed = updates.subscribed;
  }
  if (updates.incrementVisit) {
    existing.visitCount += 1;
  }

  return existing;
}

function updateRegisteredSearchStats(questionRecord) {
  if (!questionRecord.email) return;

  const reg = upsertRegistration({
    email: questionRecord.email,
    id: questionRecord.userId,
    name: questionRecord.userName
  });

  if (!reg) return;

  reg.questionCount = Number(reg.questionCount || 0) + 1;
  reg.lastQuestion = questionRecord.text;
  reg.lastQuestionAt = questionRecord.timestamp;
  reg.categoryCounts[questionRecord.category] = Number(reg.categoryCounts[questionRecord.category] || 0) + 1;
  reg.searchHistory = [
    {
      text: questionRecord.text,
      category: questionRecord.category,
      timestamp: questionRecord.timestamp,
      chatId: questionRecord.chatId,
      sessionId: questionRecord.sessionId
    },
    ...reg.searchHistory
  ].slice(0, 25);
}

function rebuildRegistrationSearchStats() {
  const byEmail = new Map();

  for (const reg of analyticsData.registrations) {
    reg.questionCount = 0;
    reg.categoryCounts = {};
    reg.searchHistory = [];
    delete reg.lastQuestion;
    delete reg.lastQuestionAt;
    byEmail.set(reg.email, reg);
  }

  const questions = [...analyticsData.questions]
    .filter(question => question.email)
    .sort((a, b) => b.timestamp - a.timestamp);

  for (const question of questions) {
    const email = normalizeEmail(question.email);
    if (!email) continue;

    let reg = byEmail.get(email);
    if (!reg) {
      reg = {
        email,
        userId: cleanString(question.userId, 120),
        name: cleanString(question.userName, 120),
        timestamp: question.timestamp,
        firstSeen: question.timestamp,
        lastSeen: question.timestamp,
        subscribed: true,
        visitCount: 0,
        questionCount: 0,
        categoryCounts: {},
        searchHistory: []
      };
      analyticsData.registrations.push(reg);
      byEmail.set(email, reg);
    }

    reg.userId = cleanString(question.userId, 120) || reg.userId || '';
    reg.name = cleanString(question.userName, 120) || reg.name || '';
    reg.questionCount += 1;
    reg.categoryCounts[question.category] = Number(reg.categoryCounts[question.category] || 0) + 1;
    reg.lastSeen = Math.max(Number(reg.lastSeen || 0), Number(question.timestamp || 0));
    reg.timestamp = Math.max(Number(reg.timestamp || 0), Number(question.timestamp || 0));

    if (!reg.lastQuestionAt || question.timestamp > reg.lastQuestionAt) {
      reg.lastQuestion = question.text;
      reg.lastQuestionAt = question.timestamp;
    }

    if (reg.searchHistory.length < 25) {
      reg.searchHistory.push({
        text: question.text,
        category: question.category,
        timestamp: question.timestamp,
        chatId: question.chatId,
        sessionId: question.sessionId
      });
    }
  }
}

function buildSearchGroups(questions) {
  const groups = new Map();

  for (const question of questions) {
    const category = question.category || categorizeQuestion(question.text);
    if (!groups.has(category)) {
      groups.set(category, {
        category,
        count: 0,
        latestAt: 0,
        latestQuestions: []
      });
    }

    const group = groups.get(category);
    group.count += 1;
    group.latestAt = Math.max(group.latestAt, Number(question.timestamp || 0));

    if (group.latestQuestions.length < 5) {
      group.latestQuestions.push({
        text: question.text,
        timestamp: question.timestamp,
        email: question.email || ''
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.count - a.count || b.latestAt - a.latestAt);
}

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
      ensureAnalyticsShape();
      console.log('📊 Loaded analytics database successfully.');
    } else {
      console.log('📊 Analytics file not found. Seeding initial mock database...');
      seedAnalytics();
      ensureAnalyticsShape();
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

// Multi-Provider AI Engine (Gemini, Groq Fallback, OpenAI)
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GROQ_FALLBACK_MODEL = 'qwen/qwen3.8-27b';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

function normalizeApiKey(value) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

function isConfigured(value) {
  return normalizeApiKey(value).length > 0;
}

function normalizeProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  return ['auto', 'gemini', 'groq', 'openai'].includes(provider) ? provider : 'auto';
}

function shouldTryNextAiProvider(error) {
  const retryableStatuses = new Set([401, 403, 404, 429, 500, 502, 503, 504]);
  const message = error.message || '';
  return retryableStatuses.has(error.status) || /not configured|api key|authentication|unauthorized|forbidden|not found|not supported|high demand|overloaded|temporarily unavailable|quota/i.test(message);
}

async function callGemini(prompt, modelName, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.25,
          topP: 0.9,
          maxOutputTokens: 1800,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.provider = 'gemini';
    throw error;
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}

async function callOpenAiCompatibleProvider({ endpoint, apiKey, modelName, prompt, provider }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System. Follow instructions exactly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.25,
      top_p: 0.9,
      max_tokens: 1800
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `${provider} request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.provider = provider;
    throw error;
  }

  const text = payload?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(`${provider} returned an empty response.`);
  }

  return text;
}

async function callGeminiProvider(prompt, customKeys = {}, customModels = {}) {
  const apiKey = normalizeApiKey(customKeys?.geminiApiKey || customKeys?.geminiKey || process.env.GEMINI_API_KEY);

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured.');
    error.status = 503;
    error.provider = 'gemini';
    throw error;
  }

  const modelNames = [
    customModels?.geminiModel || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    customModels?.geminiFallbackModel || process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL,
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash'
  ].filter(Boolean);

  let lastError;
  for (const modelName of [...new Set(modelNames)]) {
    try {
      return {
        text: await callGemini(prompt, modelName, apiKey),
        provider: 'gemini',
        model: modelName
      };
    } catch (error) {
      lastError = error;
      if (!shouldTryNextAiProvider(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function callGroq(prompt, customKeys = {}, customModels = {}) {
  const apiKey = normalizeApiKey(customKeys?.groqApiKey || customKeys?.groqKey || process.env.GROQ_API_KEY);

  if (!apiKey) {
    const error = new Error('GROQ_API_KEY is not configured.');
    error.status = 503;
    error.provider = 'groq';
    throw error;
  }

  const modelNames = [
    customModels?.groqModel || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    DEFAULT_GROQ_FALLBACK_MODEL,
    'openai/gpt-oss-20b',
    'llama-3.1-8b-instant'
  ].filter(Boolean);

  let lastError;
  for (const modelName of [...new Set(modelNames)]) {
    try {
      return {
        text: await callOpenAiCompatibleProvider({
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          apiKey,
          modelName,
          prompt,
          provider: 'groq'
        }),
        provider: 'groq',
        model: modelName
      };
    } catch (error) {
      lastError = error;
      if (!shouldTryNextAiProvider(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function callOpenAi(prompt, customKeys = {}, customModels = {}) {
  const apiKey = normalizeApiKey(customKeys?.openaiApiKey || customKeys?.openaiKey || process.env.OPENAI_API_KEY);

  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured.');
    error.status = 503;
    error.provider = 'openai';
    throw error;
  }

  const model = customModels?.openaiModel || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  return {
    text: await callOpenAiCompatibleProvider({
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey,
      modelName: model,
      prompt,
      provider: 'openai'
    }),
    provider: 'openai',
    model
  };
}

function buildProviderPlan(preferredProvider, fallbackProvider, customKeys = {}) {
  const preferred = normalizeProvider(preferredProvider || process.env.AI_PROVIDER || 'auto');
  const fallback = normalizeProvider(fallbackProvider || 'groq');

  const configuredProviders = {
    gemini: isConfigured(customKeys?.geminiApiKey || customKeys?.geminiKey || process.env.GEMINI_API_KEY),
    groq: isConfigured(customKeys?.groqApiKey || customKeys?.groqKey || process.env.GROQ_API_KEY),
    openai: isConfigured(customKeys?.openaiApiKey || customKeys?.openaiKey || process.env.OPENAI_API_KEY)
  };
  const onlyConfigured = (providers) => providers.filter(p => configuredProviders[p]);

  let order;
  if (preferred === 'auto' || preferred === 'gemini') {
    order = ['gemini', fallback !== 'gemini' ? fallback : 'groq', 'openai'];
  } else if (preferred === 'groq') {
    order = ['groq', fallback !== 'groq' ? fallback : 'gemini', 'openai'];
  } else if (preferred === 'openai') {
    order = ['openai', fallback !== 'openai' ? fallback : 'groq', 'gemini'];
  } else {
    order = ['gemini', 'groq', 'openai'];
  }

  const deduped = [...new Set(order)];
  const plan = onlyConfigured(deduped);
  return plan.length > 0 ? plan : deduped;
}

async function generateAiAnswer(prompt, preferredProvider, fallbackProvider, customKeys, customModels) {
  const providerPlan = buildProviderPlan(preferredProvider, fallbackProvider, customKeys);
  let lastError;
  const primaryProvider = providerPlan[0];

  for (let i = 0; i < providerPlan.length; i++) {
    const provider = providerPlan[i];
    try {
      let result;
      if (provider === 'gemini') result = await callGeminiProvider(prompt, customKeys, customModels);
      else if (provider === 'groq') result = await callGroq(prompt, customKeys, customModels);
      else if (provider === 'openai') result = await callOpenAi(prompt, customKeys, customModels);

      if (result) {
        return {
          ...result,
          fallbackUsed: i > 0,
          primaryProvider,
          providerPlan
        };
      }
    } catch (error) {
      console.warn(`[Midlex AI] ${provider} failed (${error.message || error.status}). Attempting next provider in plan...`);
      lastError = error;
      if (!shouldTryNextAiProvider(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('No configured AI provider succeeded.');
}

const jurisdictionRule = `Jurisdiction rule:
- First check whether the user mentioned a Nigerian state, Abuja/FCT, a geopolitical region, or a local authority in the current message or earlier turns in this same chat.
- If the current message mentions a state, FCT, region, or local authority, treat that as the active jurisdiction and answer under that jurisdiction's law where relevant.
- If the current message does not mention a new jurisdiction but earlier turns in this chat did, continue using the earlier active jurisdiction and say that you are applying it.
- If no state or region is known and the answer can differ by state, say clearly that state law may differ, give the general Nigerian/federal position, mention any relevant state-specific examples you know from reliable law or the retrieved materials, and ask the user to provide the state for a more precise answer.
- For topics that often differ by state or region, such as tenancy, limitation/adverse possession, probate and inheritance, customary marriage, road traffic/towing rules, criminal code/penal code differences, land procedures, taxes, and local government rules, include a short jurisdiction note before the conclusion.
- If several states have different rules for the same issue and you know the difference from the retrieved materials or reliable general knowledge, compare them briefly. Do not invent state laws, penalties, deadlines, or section numbers.`;

const quotationRule = `Quotation rule:
- When retrieved legal source text is available, include a short **Quoted law:** section before the explanation.
- Quote the exact words from the retrieved "Official Text" only. Use quotation marks or blockquote formatting.
- Every quote must name the Act/Code/Law, year where it appears in the title, chapter or part where provided, section, and source page/PDF page where provided.
- Example citation style: **Land Use Act 1978, Part V, Section 28, PDF page 13:** "It shall be lawful for the Governor to revoke..."
- If there is no retrieved exact text or page reference for a point, do not invent one. Say the exact quote is not available in the current sources and give the general principle carefully.`;

const verifiedExamplesRule = `Verified public examples rule:
- If a useful public example, decided case, public authority, or practical example is available from the retrieved source text, include it after the main answer under **Verified public example:**.
- Before using any example, verify it against the retrieved materials. A verified example must be present in the retrieved source text, source title, source URL, or source page details.
- If no verified public example is available from the retrieved materials, do not use examples or case names. Say briefly: "No verified public example is available from the current retrieved sources."
- Do not guess, invent, or rely on memory for case examples, citations, locus classicus claims, public examples, dates, reporters, page numbers, or facts.
- Do not use invented hypothetical examples as substitutes for verified public examples.
- Never call a case the locus classicus unless that exact case and status are verified from the retrieved materials.`;

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

function getPublicGeminiError(err) {
  const message = err?.message || '';

  if (/429|too many requests|quota|rate limit|rate-limits|retryDelay/i.test(message)) {
    return {
      status: 429,
      code: 'GEMINI_QUOTA_LIMIT',
      message: 'Gemini is temporarily busy or quota-limited. Please try again in about 1 minute.'
    };
  }

  if (/503|overloaded|high demand|temporarily unavailable|unavailable/i.test(message)) {
    return {
      status: 503,
      code: 'GEMINI_TEMPORARILY_BUSY',
      message: 'Gemini is temporarily busy. Please try again shortly.'
    };
  }

  if (/401|403|api key|authentication|permission|unauthorized|forbidden/i.test(message)) {
    return {
      status: 503,
      code: 'GEMINI_CONFIGURATION_ERROR',
      message: 'The AI service is not available right now. Please contact support if this continues.'
    };
  }

  return {
    status: 502,
    code: 'GEMINI_REQUEST_FAILED',
    message: 'The AI service could not complete that answer right now. Please try again.'
  };
}

function extractCaseAuthorities(text) {
  const value = cleanString(text, 4000);
  const authorities = new Set();

  const casePatterns = [
    /\b[A-Z][A-Za-z0-9&.,'’ -]{2,80}\s+v\.?\s+[A-Z][A-Za-z0-9&.,'’ -]{2,80}(?:\s+\(\d{4}\)[A-Za-z0-9 .()/-]{0,80})?/g
  ];

  for (const pattern of casePatterns) {
    for (const match of value.matchAll(pattern)) {
      const cleaned = match[0]
        .replace(/\s+/g, ' ')
        .replace(/[.,;:\s]+$/, '')
        .trim();

      if (cleaned.length >= 8 && cleaned.length <= 180) {
        authorities.add(cleaned);
      }
    }
  }

  return [...authorities].slice(0, 6);
}

function normalizeAuthorityText(value) {
  return cleanString(value, 240)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findUnverifiedCaseAuthorities(answerText, verifiedText = '') {
  const verified = normalizeAuthorityText(verifiedText);

  return extractCaseAuthorities(answerText).filter(authority => {
    const normalized = normalizeAuthorityText(authority);
    return normalized && !verified.includes(normalized);
  });
}

async function generateVerifiedAiAnswer(prompt, verifiedText = '', preferredProvider = 'auto', fallbackProvider = 'groq', customKeys = {}, customModels = {}) {
  const firstDraft = await generateAiAnswer(prompt, preferredProvider, fallbackProvider, customKeys, customModels);
  const unverifiedAuthorities = findUnverifiedCaseAuthorities(firstDraft.text, verifiedText);

  if (unverifiedAuthorities.length === 0) {
    return firstDraft;
  }

  const rewritePrompt = `${prompt}

The previous draft named these case examples or public authorities, but they were not verified in the retrieved materials:
${unverifiedAuthorities.map(item => `- ${item}`).join('\n')}

Rewrite the answer now. Remove every unverified case example, reporter citation, locus classicus claim, public example, or external authority that is not present in the retrieved materials. Do not replace them with new examples. If no verified public example is available from the retrieved materials, say exactly: "No verified public example is available from the current retrieved sources." Keep the answer useful, practical, and end with **In conclusion:**.`;

  return generateAiAnswer(rewritePrompt, preferredProvider, fallbackProvider, customKeys, customModels);
}

function buildAiResearchBasis(question, provider = 'AI') {
  const source = {
    id: `ai-research-${Date.now()}`,
    category: 'Research Basis',
    section: `${provider} general legal knowledge`,
    title: 'AI-generated legal research basis',
    act: `Midlex AI / ${provider}`,
    chapter: 'No matched local source',
    part: 'General Nigerian-law response',
    sourcePage: 'No official page retrieved',
    sourceUrl: '',
    isGeneratedBasis: true,
    content: 'No exact official source or verified public example was retrieved from the Midlex local law database for this question. This card is not an official citation; it explains that the answer was generated without attaching a verified public example.',
    reasoning: `The question "${cleanString(question, 220)}" did not match a stored Midlex public-code source strongly enough, so ${provider} answered from general Nigerian-law knowledge. Unverified case examples should not be used for this answer.`
  };

  return {
    sources: [source],
    reasoning: [{
      id: source.id,
      source: source.section,
      rationale: source.reasoning
    }]
  };
}

// Track page visit (Pinged by client session storage)
app.post('/api/analytics/visit', (req, res) => {
  const { sessionId, user, email, userId, name } = req.body || {};
  const userInfo = normalizeUserPayload(user || { email, userId, name });
  const timestamp = Date.now();

  analyticsData.visits.push({
    id: createAnalyticsId('visit'),
    timestamp,
    sessionId: cleanString(sessionId, 120),
    email: userInfo.email,
    userId: userInfo.id,
    userName: userInfo.name,
    ip: getClientIp(req),
    userAgent: cleanString(req.headers['user-agent'], 500),
    referer: cleanString(req.headers.referer || req.headers.referrer, 500),
    origin: cleanString(req.headers.origin, 240)
  });

  if (userInfo.email) {
    upsertRegistration(userInfo, { incrementVisit: true });
  }

  saveAnalytics();
  res.json({ success: true });
});

// Track registered user sign-in
app.post('/api/analytics/register', (req, res) => {
  const { email, userId, name, sessionId } = req.body || {};
  const userInfo = normalizeUserPayload({ email, userId, name });

  if (userInfo.email) {
    const registration = upsertRegistration(userInfo, { incrementVisit: true });
    if (registration) {
      registration.lastSessionId = cleanString(sessionId, 120);
    }
    saveAnalytics();
  }

  res.json({ success: true });
});

// Update client newsletter subscription opt-in
app.post('/api/analytics/subscribe', (req, res) => {
  const { email, userId, name, sessionId, subscribed } = req.body || {};
  const userInfo = normalizeUserPayload({ email, userId, name });

  if (userInfo.email) {
    const registration = upsertRegistration(userInfo, { subscribed: !!subscribed });
    if (registration) {
      registration.lastSessionId = cleanString(sessionId, 120);
      console.log(`🔔 Subscription status updated for ${userInfo.email}: ${registration.subscribed}`);
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

    ensureAnalyticsShape();

    // Registered clients
    const registrations = [...analyticsData.registrations].sort((a, b) => b.lastSeen - a.lastSeen);
    const registeredCount = new Set(registrations.map(r => r.email)).size;
    const questions = [...analyticsData.questions].sort((a, b) => b.timestamp - a.timestamp);
    const searchGroups = buildSearchGroups(questions);
    const totalSearches = questions.length;

    // Top questions count
    const questionCounts = {};
    questions.forEach(q => {
      const txt = cleanString(q.text, 1200);
      if (txt) {
        if (!questionCounts[txt]) {
          questionCounts[txt] = {
            text: txt,
            count: 0,
            category: q.category || categorizeQuestion(txt),
            latestAt: q.timestamp
          };
        }
        questionCounts[txt].count += 1;
        questionCounts[txt].latestAt = Math.max(questionCounts[txt].latestAt, q.timestamp);
      }
    });

    const topQuestions = Object.values(questionCounts)
      .sort((a, b) => b.count - a.count || b.latestAt - a.latestAt)
      .slice(0, 15); // Show top 15 questions
    const recentSearches = questions.slice(0, 50);

    // Historical articles list
    const articles = [...(analyticsData.articles || [])].sort((a, b) => b.timestamp - a.timestamp);

    return res.json({
      success: true,
      stats: {
        registeredCount,
        visitsToday,
        visitsThisWeek,
        visitsThisMonth,
        totalSearches,
        searchGroups,
        recentSearches,
        topQuestions,
        registrations: registrations.slice(0, 30), // Return last 30 registration activities
        articles: articles // History of published updates
      }
    });
  } else {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
});

// Chat API Endpoint with Multi-Provider Support and Fallback
app.post('/api/chat', async (req, res) => {
  const {
    message,
    conversationHistory,
    chatId,
    sessionId,
    user,
    aiProvider,
    fallbackProvider,
    customKeys,
    customModels
  } = req.body || {};

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required.' });
  }

  const cleanMessage = message.trim();
  const normalizedHistory = normalizeConversationHistory(conversationHistory);
  const conversationMemory = buildConversationMemory(cleanMessage, normalizedHistory);
  const searchText = buildSearchText(cleanMessage, normalizedHistory);

  console.log(`💬 User Query: "${cleanMessage}"`);

  // Step 1: Query local database to retrieve matching legal sections
  const localMatch = searchLegalDatabase(searchText);
  const userInfo = normalizeUserPayload(user);
  const sourceCategories = [...new Set((localMatch.sources || [])
    .map(source => normalizeAnalyticsCategory(source.category || source.act || source.title))
    .filter(Boolean))];
  const questionRecord = {
    id: createAnalyticsId('q'),
    text: cleanMessage,
    timestamp: Date.now(),
    category: categorizeQuestion(cleanMessage, localMatch),
    sessionId: cleanString(sessionId, 120),
    chatId: cleanString(chatId, 120),
    email: userInfo.email,
    userId: userInfo.id,
    userName: userInfo.name,
    matchedSourcesCount: (localMatch.sources || []).length,
    sourceCategories
  };

  analyticsData.questions.push(questionRecord);
  updateRegisteredSearchStats(questionRecord);
  saveAnalytics();

  const preferredProvider = normalizeProvider(aiProvider || process.env.AI_PROVIDER || 'auto');
  const safeFallbackProvider = normalizeProvider(fallbackProvider || 'groq');

  const hasSources = localMatch.sources && localMatch.sources.length > 0;
  let systemPrompt;
  let verifiedText;

  if (!hasSources) {
    systemPrompt = `You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System.
The user sent a message or asked a question: "${cleanMessage}".

${conversationMemory}

Please respond in character as a professional legal counsel:
1. If the message is a general greeting or introduction, introduce yourself and explain what you can do (e.g., answering questions on the Constitution, Land Use Act, Criminal Code, and Electoral Act 2022).
2. If the user is asking a specific legal question (e.g., about a car accident, vehicle towing, contracts, family law, etc.), please answer their question directly, thoroughly, and professionally using your general knowledge of the Nigerian Legal System (e.g., relevant tort principles, state traffic laws, etc.).
3. Keep the tone helpful, professional, and authoritative.
4. Apply this rule in every answer:
${jurisdictionRule}
5. Apply this quotation rule:
${quotationRule}
6. Apply this public examples rule:
${verifiedExamplesRule}
7. When no retrieved exact legal text is available, do not fabricate statutory quotations, chapter numbers, page numbers, years, penalties, case examples, or deadlines.
8. Always end with a short final summary headed exactly **In conclusion:** that directly answers the user's question and gives the safest next step.
9. CRITICAL: Do NOT use robotic phrases such as "Based on the provided context...", "According to the context...", "There is no information in the context...", "The database does not contain...". Do NOT mention database limitations, missing files, or reference contexts. Speak naturally as an expert lawyer who knows the law.`;
    verifiedText = cleanMessage;
  } else {
    const contextText = localMatch.sources.map((s, idx) => {
      return `[SOURCE ${idx + 1}]: ${s.act} - ${s.section} (Titled: "${s.title}")
Citation Details: Act/Law: ${s.act}; Section: ${s.section}; Chapter/Part: ${s.chapter || "not provided"} / ${s.part || "not provided"}; Source page: ${s.sourcePage || "not provided"}
Chapter/Part: ${s.chapter || ""} / ${s.part || ""}
Official Text: "${s.content}"
Standard Rationale: ${s.reasoning || ""}
Reference: ${s.sourcePage || "Registry source"}${s.sourceUrl ? ` - ${s.sourceUrl}` : ""}`;
    }).join('\n\n');

    systemPrompt = `You are Midlex AI, an elite legal assistant specialized in the Nigerian Legal System.
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
2. Apply this quotation rule:
${quotationRule}
3. Apply this public examples rule:
${verifiedExamplesRule}
4. Keep the explanation readable and highly structured. Use paragraphs and bullet points.
5. Maintain a professional, objective, and authoritative tone suitable for legal assistance.
6. Apply this rule in every answer:
${jurisdictionRule}
7. If the provided legal sections do not fully cover the answer, you may supplement it with general Nigerian legal principles, but do not add public examples or case names unless verified from the retrieved materials.
8. Do not invent procedural dates, waiting periods, filing deadlines, penalties, case examples, court requirements, or locus classicus claims unless they are present in the provided sources. If a detail is not in the sources, say that the user should confirm it from the court record or current rules.
9. Always end with a short final summary headed exactly **In conclusion:** that directly answers the user's question and gives the safest next step.
10. CRITICAL: Do NOT use robotic phrases such as "Based on the provided context...", "According to the context...", "There is no information in the context...", "The database does not contain...". Do NOT mention database limitations, missing files, or reference contexts. Speak naturally as an expert lawyer who knows the law.`;
    verifiedText = `${contextText}\n${cleanMessage}`;
  }

  try {
    const generated = await generateVerifiedAiAnswer(systemPrompt, verifiedText, preferredProvider, safeFallbackProvider, customKeys, customModels);
    const providerLabel = generated.provider ? generated.provider.toUpperCase() : 'AI';
    const researchBasis = hasSources ? null : buildAiResearchBasis(cleanMessage, providerLabel);

    return res.json({
      answerText: generated.text,
      sources: hasSources ? localMatch.sources : researchBasis.sources,
      reasoning: hasSources ? localMatch.reasoning : researchBasis.reasoning,
      engine: generated.provider || 'ai',
      provider: generated.provider || 'ai',
      model: generated.model,
      fallbackUsed: !!generated.fallbackUsed,
      primaryProvider: generated.primaryProvider,
      requestedProvider: preferredProvider
    });
  } catch (err) {
    console.error('❌ AI generation failed across all providers:', err.message);
    const publicError = getPublicGeminiError(err);
    return res.status(publicError.status).json({
      error: publicError.message,
      code: publicError.code,
      engine: preferredProvider
    });
  }
});

// Admin AI Settings & Diagnostics Endpoint
app.get('/api/admin/ai-settings', (req, res) => {
  res.json({
    success: true,
    aiProvider: process.env.AI_PROVIDER || 'auto',
    geminiConfigured: isConfigured(process.env.GEMINI_API_KEY),
    groqConfigured: isConfigured(process.env.GROQ_API_KEY),
    openaiConfigured: isConfigured(process.env.OPENAI_API_KEY),
    models: {
      gemini: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      groq: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
      openai: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    }
  });
});

app.post('/api/admin/ai-settings', (req, res) => {
  const { email, password, aiProvider, geminiApiKey, groqApiKey, openaiApiKey } = req.body || {};

  if (email === 'midlexllp01@gmail.com' && password === 'Admin@123') {
    if (aiProvider) {
      process.env.AI_PROVIDER = normalizeProvider(aiProvider);
    }
    if (typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
    }
    if (typeof groqApiKey === 'string' && groqApiKey.trim()) {
      process.env.GROQ_API_KEY = groqApiKey.trim();
    }
    if (typeof openaiApiKey === 'string' && openaiApiKey.trim()) {
      process.env.OPENAI_API_KEY = openaiApiKey.trim();
    }

    return res.json({
      success: true,
      message: 'Server AI settings updated successfully.',
      aiProvider: process.env.AI_PROVIDER || 'auto',
      geminiConfigured: isConfigured(process.env.GEMINI_API_KEY),
      groqConfigured: isConfigured(process.env.GROQ_API_KEY),
      openaiConfigured: isConfigured(process.env.OPENAI_API_KEY)
    });
  }

  return res.status(401).json({ error: 'Invalid admin credentials.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Midlex AI Backend Server running at http://localhost:${PORT}`);
  console.log(`👉 API Endpoint: http://localhost:${PORT}/api/chat`);
});
