import { legalData } from './legalData.js';

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
  'your', 'yours', 'yourself', 'yourselves', 'my', 'mine', 'shall', 'should', 'can', 'will', 'may', 'give', 'get'
]);

export function searchLegalDatabase(query) {
  if (!query || query.trim() === '') {
    return {
      answerText: "Please enter a question or legal topic to search.",
      sources: [],
      reasoning: []
    };
  }

  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));

  if (tokens.length === 0) {
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

      if (item.category.toLowerCase().includes(token)) {
        score += 15;
        tokenMatched = true;
      }

      if (item.act.toLowerCase().includes(token)) {
        score += 10;
        tokenMatched = true;
      }

      if (item.title.toLowerCase().includes(token)) {
        score += 8;
        tokenMatched = true;
      }

      const keywordMatches = item.keywords.filter(kw => kw.toLowerCase().includes(token));
      if (keywordMatches.length > 0) {
        score += 5 * keywordMatches.length;
        tokenMatched = true;
      }

      if (item.section.toLowerCase().includes(token)) {
        score += 8;
        tokenMatched = true;
      }

      const contentMatches = (item.content.toLowerCase().match(new RegExp(token, 'g')) || []).length;
      if (contentMatches > 0) {
        score += 2 * contentMatches;
        tokenMatched = true;
      }

      const reasoningMatches = (item.reasoning.toLowerCase().match(new RegExp(token, 'g')) || []).length;
      if (reasoningMatches > 0) {
        score += 1 * reasoningMatches;
        tokenMatched = true;
      }

      if (tokenMatched) {
        matchedTokens.push(token);
      }
    }

    if (score > 0) {
      results.push({ item, score, matchedTokens });
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return {
      answerText: `I couldn't find any direct matches in our database for "${query}". \n\nHowever, I can assist you with questions concerning:\n• **Fundamental Rights** (e.g., freedom of speech, right to life, bail, police arrests)\n• **Land Ownership & Leases** (e.g., C of O, Governor's consent, land revocation)\n• **Criminal Offenses** (e.g., definition and penalties for theft, murder)\n• **Elections** (e.g., BVAS, result transmission, electoral offences under the Electoral Act 2022).`,
      sources: [],
      reasoning: []
    };
  }

  const topMatches = results.slice(0, 3);
  
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
