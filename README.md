# Midlex AI - Nigerian Legal Intelligence Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Groq](https://img.shields.io/badge/Fallback-Groq-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white)](https://midlex-ai.thispage.xyz/)

Midlex AI is an intelligent legal research, analysis, and advisory assistant specialized in Nigerian jurisprudence. Built with precision statutory retrieval, verified legal citations, and a resilient multi-provider AI architecture (Google Gemini primary with instant Groq failover), Midlex AI assists legal practitioners, researchers, students, and citizens in navigating Nigerian law.

---

## Live Deployments

- **Production URL**: [https://midlex-ai.thispage.xyz](https://midlex-ai.thispage.xyz)
- **Alternate Mirror**: [https://midlex.thispage.xyz](https://midlex.thispage.xyz)
- **Repository**: [https://github.com/Omatsulijoshua/midlex-ai](https://github.com/Omatsulijoshua/midlex-ai)

---

## Key Features

### 1. Nigerian Jurisprudence Knowledge Base
- **Statutory Retrieval**: Curated legal index covering major Nigerian federal and state laws.
- **Accurate Quotations & Citations**: Answers reference specific sections, acts, chapters, and verifiable public precedents.
- **Structured Legal Formatting**: Responses break down statutory reasoning, applicable provisions, and jurisdiction-specific caveats.

### 2. Resilient Multi-Provider AI Engine
- **Primary Engine**: Google Gemini (`gemini-3.6-flash` / `gemini-3.8-flash`) configured with optimized latency (`thinkingBudget = 0`) delivering near-instant responses (~1.1s).
- **Automated Fallback**: If Gemini encounters rate limits (429), quota exhaustion, or service downtime, the engine automatically falls back to Groq (`openai/gpt-oss-120b`).
- **OpenAI Compatible**: Seamless support for OpenAI models (`gpt-4o-mini`, `gpt-4o`) as primary or secondary options.

### 3. Dynamic Admin AI Dashboard
- **Live Provider Switching**: Toggle between `Auto`, `Gemini`, `Groq`, and `OpenAI` directly in the UI without redeploying code.
- **Fallback Customization**: Select preferred fallback providers or disable failover.
- **Runtime API Key Overrides**: Enter custom API keys securely with visibility toggles; keys are preserved in client storage and synced with server sessions.
- **Built-in Connection Tester**: Test latency and verify API keys in real time directly from the admin panel.
- **Analytics & Logs**: Monitor query volumes, token consumption, fallback frequencies, and user satisfaction ratings.

### 4. Legal Research Tools
- **Interactive Chat Assistant**: Context-aware legal conversations with exportable threads.
- **Document Explorer**: Browse, search, and inspect Nigerian statutory codes and acts.
- **Articles & Precedents**: Curated legal analyses and explainers for common legal scenarios (tenancy, marriage, corporate filings, fundamental rights).
- **Saved Conversations**: Sync chat history to Firebase Firestore or preserve locally.
- **Secure Authentication**: Optional user sign-in via Google OAuth powered by Firebase.

---

## Covered Legal Frameworks

Midlex AI includes specialized context and citation logic for major Nigerian legislation:

- **Constitution of the Federal Republic of Nigeria 1999 (as amended)** (Fundamental Rights, Chapter IV)
- **Companies and Allied Matters Act 2020 (CAMA)** (Corporate governance, incorporation, compliance)
- **Matrimonial Causes Act, Cap M7 LFN 2004** (Statutory marriages, dissolution, custody)
- **Land Use Act 1978** (Governor's consent, Certificate of Occupancy, rights of occupancy)
- **Labour Act, Cap L1 LFN 2004** (Employment terms, termination, redundancy)
- **Criminal Code Act & Penal Code Law** (Offences, defences, criminal liability)
- **State Tenancy Laws** (Notice periods, statutory forms, eviction procedures across Lagos, FCT, etc.)

---

## Architecture

```
 midlex-ai/
 ├── api/                      # Vercel Serverless Functions
 │   └── chat.js               # Multi-provider AI pipeline & Admin sync
 ├── server/                   # Standalone Node.js / Express Server
 │   ├── index.js              # Express REST API, AI routing, analytics
 │   ├── package.json          # Backend dependencies
 │   └── .env                  # Backend environment secrets (gitignored)
 ├── src/                      # React 19 Frontend
 │   ├── assets/               # Images and static assets
 │   ├── components/           # UI Components
 │   │   ├── AdminDashboardModal.jsx # Admin settings & AI provider controls
 │   │   ├── ArticlesModal.jsx       # Legal articles & case studies
 │   │   ├── AuthManager.jsx         # Firebase login modal
 │   │   ├── ChatAssistant.jsx       # Main interactive legal chat
 │   │   ├── DocumentExplorer.jsx    # Statute and document browser
 │   │   ├── RightPanel.jsx          # Context, cited sources, related laws
 │   │   └── SavedChatsPanel.jsx     # Saved history and sessions
 │   ├── config/               # Firebase configuration
 │   ├── data/                 # Indexed Nigerian legal statutes
 │   ├── utils/                # API connectors and search helpers
 │   ├── App.jsx               # Root application layout and state
 │   └── main.jsx              # React DOM entry point
 ├── vercel.json               # Serverless timeout & routing configuration
 └── vite.config.js            # Vite bundler configuration
```

---

## Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/), [Lucide React Icons](https://lucide.dev/)
- **Backend / Serverless**: [Node.js](https://nodejs.org/), [Express 4](https://expressjs.com/), [Vercel Serverless Functions](https://vercel.com/docs/functions)
- **AI SDKs**: Google Generative AI (`@google/generative-ai`), Groq REST API, OpenAI REST API
- **Auth & Database**: [Firebase Auth](https://firebase.google.com/docs/auth), [Firestore](https://firebase.google.com/docs/firestore)
- **Styling**: Modern CSS3 with dark/light theme tokens and gold accents

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- API Keys:
  - **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))
  - **Groq API Key** (from [Groq Console](https://console.groq.com/))
  - *(Optional)* **OpenAI API Key** (from [OpenAI Platform](https://platform.openai.com/))
  - *(Optional)* **Firebase Web App Config** (from [Firebase Console](https://console.firebase.google.com/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Omatsulijoshua/midlex-ai.git
   cd midlex-ai
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies** (if running the standalone Express server):
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```
   If running the standalone Express server, also create `server/.env`:
   ```bash
   cp .env.example server/.env
   ```

---

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `AI_PROVIDER` | No | `auto` | Primary AI provider mode (`auto`, `gemini`, `groq`, `openai`) |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key (recommended primary) |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Gemini model ID (`gemini-3.6-flash`, `gemini-3.8-flash`) |
| `GROQ_API_KEY` | Yes | — | Groq API key (for automatic failover) |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Groq chat model (`openai/gpt-oss-120b`, `llama-3.1-8b-instant`) |
| `OPENAI_API_KEY` | No | — | OpenAI API key (optional backup) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model ID |
| `VITE_API_URL` | No | `/api` | Base URL for the chat API (use `http://localhost:5000` for local Express) |
| `VITE_FIREBASE_API_KEY` | No | — | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | — | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | No | — | Firebase Project ID |

> **Security Note**: Never commit `.env`, `.env.local`, or `server/.env` to version control. They are strictly excluded by `.gitignore`.

---

## Running Locally

### Option A: Frontend + Vercel CLI (Recommended)
This replicates the production serverless environment:
```bash
npm install -g vercel
vercel dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Frontend + Standalone Express Server
1. Start the backend:
   ```bash
   cd server
   npm start
   ```
   *(Server starts on `http://localhost:5000`)*

2. In a separate terminal, start the Vite dev server:
   ```bash
   npm run dev
   ```
   *(Client starts on `http://localhost:5173`)*

---

## Admin AI Settings Panel

Administrators can configure the AI pipeline on the fly without touching environment variables or redeploying:

1. Click the **Admin Dashboard** shield icon in the top header.
2. Navigate to the **AI Engine** tab.
3. Configure:
   - **Primary Provider**: Choose `Auto (Gemini -> Groq)`, `Google Gemini`, `Groq`, or `OpenAI`.
   - **Fallback Provider**: Choose `Groq`, `Google Gemini`, `OpenAI`, or `None`.
   - **API Keys**: Enter custom keys for any provider.
4. Click **Test AI Connection** to verify response times and model status.
5. Click **Save AI Settings** to apply changes instantly.

---

## Deployment to Vercel

The project is structured to deploy smoothly to Vercel with zero extra server configuration:

1. **Deploy via Vercel CLI**:
   ```bash
   vercel --prod
   ```

2. **Set Production Environment Variables**:
   ```bash
   vercel env add GEMINI_API_KEY production
   vercel env add GROQ_API_KEY production
   vercel env add GEMINI_MODEL production
   vercel env add GROQ_MODEL production
   vercel env add AI_PROVIDER production
   ```

3. **Domain Assignment**:
   Configure custom domains in the Vercel dashboard:
   - `midlex-ai.thispage.xyz`
   - `midlex.thispage.xyz`

---

## API Endpoints

### `POST /api/chat`
Main conversational analysis endpoint.
- **Payload**:
  ```json
  {
    "message": "What are the requirements for legal valid marriage in Nigeria under the MCA?",
    "provider": "auto",
    "fallbackProvider": "groq",
    "keys": {
      "geminiKey": "custom_key_optional",
      "groqKey": "custom_key_optional"
    }
  }
  ```
- **Response**:
  ```json
  {
    "answerText": "...",
    "sources": [ ... ],
    "reasoning": [ ... ],
    "provider": "gemini",
    "model": "gemini-3.6-flash",
    "fallbackUsed": false
  }
  ```

### `GET /api/admin/ai-settings` & `POST /api/admin/ai-settings`
Inspect or update runtime AI configuration, providers, and key presence flags.

### `GET /api/admin/analytics`
Retrieve system metrics, query distribution, provider usage rates, and error logs.

---

## Disclaimer

Midlex AI is an AI-powered legal information and research assistant. It provides statutory references, case overviews, and contextual explanations for informational and educational purposes. **Midlex AI does not constitute formal legal counsel and does not create an attorney-client relationship.** Users should consult a qualified legal practitioner registered with the Nigerian Bar Association (NBA) for formal legal representation and case-specific advice.

---

## License

This project is licensed under the [MIT License](LICENSE).
