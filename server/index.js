import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchLegalDatabase } from './legalSearch.js';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow all origins for Render deployment
app.use(express.json());

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
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not defined in server/.env.');
  console.warn('⚠️ Server will operate in Offline Fallback Mode, returning pre-authored database answers.');
}

// Chat API Endpoint with RAG Flow
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required.' });
  }

  console.log(`💬 User Query: "${message}"`);

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
