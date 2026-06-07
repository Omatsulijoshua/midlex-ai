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

  if (/429|too many requests|quota|rate limit|rate-limits|retryDelay/i.test(message)) {
    return 'Gemini is temporarily busy or quota-limited. Please try again in about 1 minute.';
  }

  if (/503|overloaded|high demand|temporarily unavailable|unavailable/i.test(message)) {
    return 'Gemini is temporarily busy. Please try again shortly.';
  }

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
Citation Details: Act/Law: ${source.act}; Section: ${source.section}; Chapter/Part: ${source.chapter || 'not provided'} / ${source.part || 'not provided'}; Source page: ${source.sourcePage || 'not provided'}
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

function cleanString(value, maxLength = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
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

async function generateVerifiedGeminiAnswer(prompt, verifiedText = '') {
  const firstDraft = await generateGeminiAnswer(prompt);
  const unverifiedAuthorities = findUnverifiedCaseAuthorities(firstDraft.text, verifiedText);

  if (unverifiedAuthorities.length === 0) {
    return firstDraft;
  }

  const rewritePrompt = `${prompt}

The previous draft named these case examples or public authorities, but they were not verified in the retrieved materials:
${unverifiedAuthorities.map(item => `- ${item}`).join('\n')}

Rewrite the answer now. Remove every unverified case example, reporter citation, locus classicus claim, public example, or external authority that is not present in the retrieved materials. Do not replace them with new examples. If no verified public example is available from the retrieved materials, say exactly: "No verified public example is available from the current retrieved sources." Keep the answer useful, practical, and end with **In conclusion:**.`;

  return generateGeminiAnswer(rewritePrompt);
}

function buildGeminiResearchBasis(question) {
  const source = {
    id: `gemini-research-${Date.now()}`,
    category: 'Research Basis',
    section: 'Gemini general legal knowledge',
    title: 'Gemini-generated legal research basis',
    act: 'Midlex AI / Gemini',
    chapter: 'No matched local source',
    part: 'General Nigerian-law response',
    sourcePage: 'No official page retrieved',
    sourceUrl: '',
    isGeneratedBasis: true,
    content: 'No exact official source or verified public example was retrieved from the Midlex local law database for this question. This card is not an official citation; it explains that the answer was generated without attaching a verified public example.',
    reasoning: `The question "${cleanString(question, 220)}" did not match a stored Midlex public-code source strongly enough, so Gemini answered from general Nigerian-law knowledge. Unverified case examples should not be used for this answer.`
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
5. Apply this quotation rule:
${quotationRule}
6. Apply this public examples rule:
${verifiedExamplesRule}
7. When no retrieved exact legal text is available, do not fabricate statutory quotations, chapter numbers, page numbers, years, penalties, case examples, or deadlines.
8. Always end with a short final summary headed exactly **In conclusion:** that directly answers the question.`;
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
2. Apply this quotation rule:
${quotationRule}
3. Apply this public examples rule:
${verifiedExamplesRule}
4. Explain the answer naturally, as a smart Nigerian-law assistant, not as a database search result.
5. Cite or name the most relevant source, section, case, or principle from the retrieved materials where available.
6. If the retrieved materials do not fully cover the answer, supplement carefully with general Nigerian legal principles and say when a fact depends on state/custom/court documents, but do not add public examples or case names unless verified from the retrieved materials.
7. Do not say "Based on the provided context", "I could not find", or mention database limitations.
8. Do not invent exact deadlines, penalties, court rules, section numbers, case examples, or locus classicus claims if they are not in the materials or you are not sure.
9. Always end with a short final summary headed exactly **In conclusion:** that directly answers the question and gives the safest next step.`;
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
    const hasVerifiedSources = localMatch.sources && localMatch.sources.length > 0;
    const verifiedText = hasVerifiedSources ? `${buildContext(localMatch.sources)}\n${cleanMessage}` : cleanMessage;
    const generated = await generateVerifiedGeminiAnswer(prompt, verifiedText);
    const researchBasis = hasVerifiedSources ? null : buildGeminiResearchBasis(cleanMessage);

    return res.status(200).json({
      answerText: generated.text,
      sources: hasVerifiedSources ? localMatch.sources : researchBasis.sources,
      reasoning: hasVerifiedSources ? (localMatch.reasoning || []) : researchBasis.reasoning,
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
