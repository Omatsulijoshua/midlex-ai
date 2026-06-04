/* global Buffer, process */
import { searchLegalDatabase } from '../src/utils/legalSearch.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-2.0-flash';
const API_REVISION = 'gemini-header-auth-v1';

function normalizeGeminiApiKey(value) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

function getGeminiKeyDiagnostics() {
  const rawKey = process.env.GEMINI_API_KEY || '';
  const trimmedKey = rawKey.trim();
  const normalizedKey = normalizeGeminiApiKey(rawKey);

  return {
    configured: normalizedKey.length > 0,
    length: rawKey.length,
    trimmedLength: trimmedKey.length,
    normalizedLength: normalizedKey.length,
    prefix: normalizedKey ? `${normalizedKey.slice(0, 4)}...` : '',
    suffix: normalizedKey ? `...${normalizedKey.slice(-4)}` : '',
    hasLeadingOrTrailingWhitespace: rawKey !== trimmedKey,
    hasWrappingQuotes: trimmedKey !== normalizedKey,
    hasEqualsPrefix: /^GEMINI_API_KEY\s*=/.test(trimmedKey),
    authTransport: 'x-goog-api-key-header',
    apiRevision: API_REVISION,
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL
  };
}

function formatGeminiError(error, diagnostics) {
  const message = error.message || 'Gemini API failed.';
  const keyLabel = diagnostics.prefix && diagnostics.suffix
    ? `${diagnostics.prefix}${diagnostics.suffix}`
    : 'the configured key';

  if (diagnostics.configured && (error.status === 401 || error.status === 403 || /invalid authentication credentials/i.test(message))) {
    return `Gemini rejected ${keyLabel} from the production server. The key is present, but Google is not authorizing it from Vercel. Create or rotate a Gemini API key in Google AI Studio, restrict it to the Gemini API only, avoid IP/referrer application restrictions for this serverless deployment, set it as GEMINI_API_KEY in Vercel Production, then redeploy.`;
  }

  return message;
}

function parseBody(req) {
  if (!req.body) return {};
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function buildContext(sources) {
  return sources.map((source, index) => `[SOURCE ${index + 1}]: ${source.act} - ${source.section} (Titled: "${source.title}")
Chapter/Part: ${source.chapter || ''} / ${source.part || ''}
Official Text: "${source.content}"
Standard Rationale: ${source.reasoning || ''}
Reference: ${source.sourcePage || 'Registry source'}${source.sourceUrl ? ` - ${source.sourceUrl}` : ''}`).join('\n\n');
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

function buildPrompt(message, localMatch, history) {
  const hasSources = localMatch.sources && localMatch.sources.length > 0;
  const conversationMemory = buildConversationMemory(message, history);

  if (!hasSources) {
    return `You are Midlex AI, an elite Nigerian legal assistant like a careful legal researcher.
The user may write with spelling mistakes, shorthand, Nigerian English, or informal wording.

User's question:
"${message}"

${conversationMemory}

Answer intelligently using your knowledge of Nigerian law. If the question concerns Nigerian law, explain the likely legal position, practical steps, and risks. If a legal point depends on state law, customary law, court documents, or facts not provided, say so clearly and ask for the missing fact naturally.

${jurisdictionRule}

Rules:
1. Correct the user's spelling and infer the likely meaning silently.
2. Do not say "I could not find a direct match" or mention database limitations.
3. Do not invent exact deadlines, penalties, court rules, or section numbers if you are not sure.
4. Use clear headings and short paragraphs.
5. Always end with a short final summary headed exactly **In conclusion:** that directly answers the question.`;
  }

  return `You are Midlex AI, an elite Nigerian legal assistant like a careful legal researcher.
The user may write with spelling mistakes, shorthand, Nigerian English, or informal wording.
Use the retrieved Nigerian legal materials below as your grounding, then apply general Nigerian legal knowledge where helpful.

Retrieved Nigerian legal materials:
===
${buildContext(localMatch.sources)}
===

User's question:
"${message}"

${conversationMemory}

${jurisdictionRule}

Instructions:
1. Correct the user's spelling and infer the likely meaning silently.
2. Explain the answer naturally, as a smart Nigerian-law assistant, not as a database search result.
3. Cite or name the most relevant source, section, case, or principle from the retrieved materials where available.
4. If the retrieved materials do not fully cover the answer, supplement carefully with general Nigerian legal principles and say when a fact depends on state/custom/court documents.
5. Do not say "Based on the provided context", "I could not find", or mention database limitations.
6. Do not invent exact deadlines, penalties, court rules, or section numbers if they are not in the materials or you are not sure.
7. Always end with a short final summary headed exactly **In conclusion:** that directly answers the question and gives the safest next step.`;
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
          maxOutputTokens: 1800
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
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

function shouldTryNextGeminiModel(error) {
  const retryableStatuses = new Set([404, 429, 500, 502, 503, 504]);
  const message = error.message || '';

  return retryableStatuses.has(error.status) || /not found|not supported|high demand|overloaded|temporarily unavailable/i.test(message);
}

async function generateGeminiAnswer(prompt) {
  const apiKey = normalizeGeminiApiKey(process.env.GEMINI_API_KEY);

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured on the server.');
    error.status = 503;
    throw error;
  }

  const modelNames = [
    process.env.GEMINI_MODEL || DEFAULT_MODEL,
    process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL
  ].filter(Boolean);

  let lastError;
  for (const modelName of [...new Set(modelNames)]) {
    try {
      return {
        text: await callGemini(prompt, modelName, apiKey),
        model: modelName
      };
    } catch (error) {
      lastError = error;
      if (!shouldTryNextGeminiModel(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { message, conversationHistory } = parseBody(req);

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required.' });
  }

  try {
    const cleanMessage = message.trim();
    const normalizedHistory = normalizeConversationHistory(conversationHistory);
    const localMatch = searchLegalDatabase(buildSearchText(cleanMessage, normalizedHistory));
    const prompt = buildPrompt(cleanMessage, localMatch, normalizedHistory);
    const generated = await generateGeminiAnswer(prompt);

    return res.status(200).json({
      answerText: generated.text,
      sources: localMatch.sources || [],
      reasoning: localMatch.reasoning || [],
      engine: 'gemini',
      model: generated.model
    });
  } catch (error) {
    const status = error.status || 502;
    const keyDiagnostics = getGeminiKeyDiagnostics();
    return res.status(status).json({
      error: formatGeminiError(error, keyDiagnostics),
      engine: 'gemini',
      keyDiagnostics
    });
  }
}
