/* global Buffer, process */
import { searchLegalDatabase } from '../src/utils/legalSearch.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-2.0-flash';

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

function buildPrompt(message, localMatch) {
  const hasSources = localMatch.sources && localMatch.sources.length > 0;
  const jurisdictionRule = `Jurisdiction rule:
- First check whether the user mentioned a Nigerian state, Abuja/FCT, or a local authority.
- If a state or FCT is mentioned, answer under that jurisdiction's law where it is relevant, and say when a federal law also applies nationwide.
- If no state is mentioned and the answer can differ by state, say clearly that state law may differ, give the general Nigerian/federal position, mention any relevant state-specific examples from the retrieved materials, and ask the user to provide the state for a more precise answer.
- If several states have different rules for the same issue and you know the difference from the retrieved materials or reliable general knowledge, compare them briefly. Do not invent state laws, penalties, deadlines, or section numbers.`;

  if (!hasSources) {
    return `You are Midlex AI, an elite Nigerian legal assistant like a careful legal researcher.
The user may write with spelling mistakes, shorthand, Nigerian English, or informal wording.

User's question:
"${message}"

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
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

async function generateGeminiAnswer(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
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
      if (!/404|not found|not supported/i.test(error.message || '')) {
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

  const { message } = parseBody(req);

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required.' });
  }

  try {
    const localMatch = searchLegalDatabase(message);
    const prompt = buildPrompt(message.trim(), localMatch);
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
    return res.status(status).json({
      error: error.message || 'Gemini API failed.',
      engine: 'gemini'
    });
  }
}
