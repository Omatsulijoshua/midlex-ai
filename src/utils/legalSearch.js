import { legalData } from '../data/legalData';

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 
  'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 
  'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 
  'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 
  'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 
  'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 
  'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 
  'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 
  'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 
  'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 
  'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 
  'your', 'yours', 'yourself', 'yourselves', 'my', 'mine', 'shall', 'should', 'can', 'will', 'may', 'give', 'get',
  'person', 'persons', 'people', 'individual', 'individuals', 'someone', 'anyone', 'everyone',
  'back', 'take', 'takes', 'taking', 'took', 'give', 'gives', 'giving', 'gave', 'get', 'gets', 'getting', 'got',
  'make', 'makes', 'making', 'made', 'go', 'goes', 'going', 'went', 'claim', 'claims', 'claiming', 'claming', 'claimed',
  'say', 'says', 'saying', 'said', 'ask', 'asks', 'asking', 'asked', 'answer', 'answers', 'answering', 'answered',
  'know', 'knows', 'knowing', 'knew', 'thing', 'things', 'case', 'cases', 'matter', 'matters', 'point', 'points',
  'fact', 'facts', 'way', 'ways', 'law', 'laws', 'legal', 'illegal', 'section', 'sections', 'act', 'acts', 'provision',
  'provisions', 'code', 'codes', 'constitute', 'constitutes', 'constitution', 'constitutions'
]);

export function searchLegalDatabase(query) {
  if (!query || query.trim() === '') {
    return {
      answerText: "Please enter a question or legal topic to search.",
      sources: [],
      reasoning: []
    };
  }

  // Pre-process and normalize common abbreviations before tokenizing
  let normalizedQuery = query.toLowerCase();
  normalizedQuery = normalizedQuery.replace(/c\s*of\s*o|c-of-o|c\.of\.o/g, 'certificate of occupancy');

  // Tokenize and normalize query
  const tokens = normalizedQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => (token.length > 2 || /^\d+$/.test(token)) && !STOPWORDS.has(token)); // Filter tokens of length > 2 or numeric tokens

  if (tokens.length === 0) {
    // If query is very simple like "hello" or "help"
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery === 'hello' || lowerQuery === 'hi') {
      return {
        answerText: "Hello! I am Midlex AI, your assistant for the Nigerian Legal System. You can ask me questions about the 1999 Constitution (Fundamental Rights), the Land Use Act, the Criminal Code Act, or the Electoral Act 2022. What would you like to know today?",
        sources: [],
        reasoning: []
      };
    }
    
    return {
      answerText: "I'm ready to help. Try asking about specific legal terms like 'fundamental rights', 'land certificate', 'stealing punishment', 'bail', or 'bvas in elections'.",
      sources: [],
      reasoning: []
    };
  }

  const results = [];

  for (const item of legalData) {
    let score = 0;
    const matchedTokens = [];

    for (const token of tokens) {
      let tokenMatched = false;

      // Simple suffix stripping (stemming) to handle pluralization and verb tenses
      let stem = token;
      if (token.endsWith('ing')) {
        stem = token.slice(0, -3);
      } else if (token.endsWith('ed') && !token.endsWith('eed')) {
        stem = token.slice(0, -2);
      } else if (token.endsWith('s') && !token.endsWith('ss')) {
        stem = token.slice(0, -1);
      }

      // Smart boundary regex:
      // If token stem is 3 letters (e.g. 'car', 'law', 'act'), require exact whole-word or its plural (e.g. \bcars?\b)
      // If token stem is 4+ letters (e.g. 'arrest', 'steal'), use word prefix (e.g. \barrest) to match arrested, stealing, etc.
      const regexStr = stem.length <= 3 ? `\\b${stem}s?\\b` : `\\b${stem}`;
      const regex = new RegExp(regexStr, 'i');

      // Match category
      if (regex.test(item.category)) {
        score += 15;
        tokenMatched = true;
      }

      // Match act name
      if (regex.test(item.act)) {
        score += 10;
        tokenMatched = true;
      }

      // Match title
      if (regex.test(item.title)) {
        score += 8;
        tokenMatched = true;
      }

      // Match keywords
      const keywordMatches = item.keywords.filter(kw => regex.test(kw));
      if (keywordMatches.length > 0) {
        score += 5 * keywordMatches.length;
        tokenMatched = true;
      }

      // Match section title
      if (regex.test(item.section)) {
        score += 8;
        tokenMatched = true;
      }

      // Match content text
      const contentMatches = (item.content.match(new RegExp(regexStr, 'gi')) || []).length;
      if (contentMatches > 0) {
        score += 2 * contentMatches;
        tokenMatched = true;
      }

      // Match reasoning
      const reasoningMatches = (item.reasoning.match(new RegExp(regexStr, 'gi')) || []).length;
      if (reasoningMatches > 0) {
        score += 1 * reasoningMatches;
        tokenMatched = true;
      }

      if (tokenMatched) {
        matchedTokens.push(token);
      }
    }

    if (score > 0) {
      // Enforce a minimum query token coverage threshold of 35%
      // This prevents single-word accidental matches on long questions
      const coverage = matchedTokens.length / tokens.length;
      if (coverage >= 0.35) {
        results.push({ item, score, matchedTokens });
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return {
      answerText: `I couldn't find any direct matches in our database for "${query}". \n\nHowever, I can assist you with questions concerning:\n• **Fundamental Rights** (e.g., freedom of speech, right to life, bail, police arrests)\n• **Land Ownership & Leases** (e.g., C of O, Governor's consent, land revocation)\n• **Criminal Offenses** (e.g., definition and penalties for theft, murder)\n• **Elections** (e.g., BVAS, result transmission, electoral offences under the Electoral Act 2022).`,
      sources: [],
      reasoning: []
    };
  }

  // Take top matches (up to 3)
  const topMatches = results.slice(0, 3);
  
  // Construct synthesised response text
  let responseText = "";
  if (topMatches.length === 1) {
    const match = topMatches[0].item;
    responseText = `According to **${match.section}** of the **${match.act}** (titled *"${match.title}"*):\n\n> "${match.content}"\n\n**Legal Implications:** ${match.reasoning}`;
  } else {
    responseText = `Based on your query, here is an analysis of the relevant provisions of Nigerian Law:\n\n`;
    topMatches.forEach((m, idx) => {
      const match = m.item;
      responseText += `${idx + 1}. **${match.section} (${match.title})** of the **${match.act}**:\n   ${match.reasoning}\n\n`;
    });
    responseText += `You can review the exact legal texts and reasoning details in the reference panel.`;
  }

  // Format sources for left panel
  const sources = topMatches.map(m => ({
    id: m.item.id,
    section: m.item.section,
    title: m.item.title,
    act: m.item.act,
    content: m.item.content,
    chapter: m.item.chapter,
    part: m.item.part,
    category: m.item.category
  }));

  // Format reasoning for left panel
  const reasoning = topMatches.map(m => ({
    id: m.item.id,
    source: `${m.item.act} - ${m.item.section}`,
    rationale: m.item.reasoning
  }));

  return {
    answerText: responseText,
    sources,
    reasoning
  };
}
