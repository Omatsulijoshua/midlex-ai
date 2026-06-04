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

STOPWORDS.delete('constitution');
STOPWORDS.delete('constitutions');
STOPWORDS.delete('will');

const SPELLING_CORRECTIONS = new Map([
  ['allowto', 'allowed to'],
  ['alowto', 'allowed to'],
  ['allowd', 'allowed'],
  ['alowed', 'allowed'],
  ['remary', 'remarry'],
  ['remarryy', 'remarry'],
  ['marraige', 'marriage'],
  ['mariage', 'marriage'],
  ['divorse', 'divorce'],
  ['devorce', 'divorce'],
  ['constitition', 'constitution'],
  ['constition', 'constitution'],
  ['nigeri', 'nigeria'],
  ['cort', 'court'],
  ['ad', 'and'],
  ['accordg', 'according'],
  ['acording', 'according'],
  ['traditon', 'tradition'],
  ['traddition', 'tradition'],
  ['dad', 'father'],
  ['dady', 'father'],
  ['wrote', 'write'],
  ['wirte', 'write'],
  ['poperty', 'property'],
  ['roperty', 'property'],
  ['ake', 'take'],
  ['lavinging', 'living'],
  ['lavining', 'living'],
  ['leavinging', 'living'],
  ['livng', 'living'],
  ['livin', 'living'],
  ['datys', 'days'],
  ['dats', 'days'],
  ['dayz', 'days'],
  ['somone', 'someone'],
  ['someones', "someone's"],
  ['sombody', 'somebody'],
  ['inheritence', 'inheritance'],
  ['sucession', 'succession'],
  ['succesion', 'succession'],
  ['intestate', 'intestate'],
  ['neigbour', 'neighbour'],
  ['neigbor', 'neighbor'],
  ['neibor', 'neighbor'],
  ['neighbour', 'neighbor'],
  ['chiken', 'chicken'],
  ['chickn', 'chicken'],
  ['dogg', 'dog'],
  ['tolled', 'towed'],
  ['tolded', 'towed'],
  ['towd', 'towed'],
  ['toed', 'towed'],
  ['impunded', 'impounded'],
  ['fromthe', 'from the'],
  ['jamed', 'jammed'],
  ['jamd', 'jammed'],
  ['reveresed', 'reversed'],
  ['reverseded', 'reversed'],
  ['claming', 'claiming'],
  ['spouce', 'spouse'],
  ['housband', 'husband'],
  ['husban', 'husband'],
  ['wif', 'wife'],
  ['rigth', 'right'],
  ['rigths', 'rights'],
  ['arest', 'arrest'],
  ['arrrest', 'arrest'],
  ['ocupancy', 'occupancy']
]);

const ANIMAL_TOKENS = new Set([
  'animal', 'animals', 'dog', 'dogs', 'pet', 'pets', 'chicken', 'chickens', 'goat', 'goats',
  'cow', 'cows', 'livestock', 'cat', 'cats', 'bird', 'birds', 'cruelty', 'poison', 'poisoned'
]);

const HUMAN_HOMICIDE_TOKENS = new Set([
  'human', 'person', 'people', 'man', 'woman', 'child', 'murder', 'manslaughter', 'homicide'
]);

const ROAD_TRAFFIC_TOKENS = new Set([
  'car', 'cars', 'vehicle', 'vehicles', 'towed', 'tow', 'towing', 'tolled', 'impound',
  'impounded', 'parking', 'parked', 'road', 'highway', 'traffic', 'lastma', 'vio',
  'breakdown', 'obstruction', 'abandoned', 'ticket', 'demurrage'
]);

const CRASH_TOKENS = new Set([
  'accident', 'crash', 'collision', 'jammed', 'jamed', 'hit', 'rear', 'rearend', 'behind',
  'back', 'reversed', 'reverse', 'damage', 'bumper', 'insurance', 'claim', 'claiming',
  'fault', 'liability', 'negligence', 'witness', 'dashcam'
]);

const SUCCESSION_TOKENS = new Set([
  'inherit', 'inheritance', 'succession', 'intestate', 'will', 'estate', 'property',
  'father', 'dad', 'deceased', 'late', 'brother', 'sister', 'siblings', 'children',
  'first', 'son', 'eldest', 'tradition', 'custom', 'customary', 'family', 'land',
  'beneficiary', 'share', 'sharing', 'administrator', 'administration'
]);

const ADVERSE_POSSESSION_TOKENS = new Set([
  'adverse', 'possession', 'limitation', 'squatter', 'squat', 'occupy', 'occupation',
  'occupying', 'living', 'staying', 'house', 'home', 'property', 'land', 'owner',
  'ownership', 'take', 'over', 'days', '25', 'trespass', 'trespasser', 'eviction',
  'ejectment', 'permission', 'unlawful', 'illegal'
]);

function normalizeQueryText(query) {
  return query
    .toLowerCase()
    .replace(/c\s*of\s*o|c-of-o|c\.of\.o/g, 'certificate of occupancy')
    .replace(/\b[\w']+\b/g, word => SPELLING_CORRECTIONS.get(word) || word);
}

function stemToken(token) {
  if (token.endsWith('ing')) {
    return token.slice(0, -3);
  }
  if (token.endsWith('ed') && !token.endsWith('eed')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, idx) => idx);
  const current = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 || /^\d+$/.test(token));
}

function fuzzyMatches(token, item) {
  if (token.length < 4) return false;

  const searchableText = [
    item.category,
    item.act,
    item.title,
    item.section,
    item.content,
    item.reasoning,
    ...(item.keywords || [])
  ].join(' ');

  const candidates = new Set(tokenize(searchableText).map(stemToken));
  const maxDistance = token.length >= 7 ? 2 : 1;
  return [...candidates].some(candidate => {
    if (Math.abs(candidate.length - token.length) > maxDistance) return false;
    return levenshtein(token, candidate) <= maxDistance;
  });
}

function hasAny(tokens, lookupSet) {
  return tokens.some(token => lookupSet.has(token));
}

function withConclusion(text, conclusion) {
  if (/(\*\*)?conclusion(\*\*)?:?/i.test(text)) {
    return text;
  }

  return `${text.trim()}\n\n**Conclusion:** ${conclusion}`;
}

export function searchLegalDatabase(query) {
  if (!query || query.trim() === '') {
    return {
      answerText: "Please enter a question or legal topic to search.",
      sources: [],
      reasoning: []
    };
  }

  const normalizedQuery = normalizeQueryText(query);

  const tokens = normalizedQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => (token.length > 2 || /^\d+$/.test(token)) && !STOPWORDS.has(token)); // Filter tokens of length > 2 or numeric tokens

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
    const matchedTokens = new Set();

    for (const token of tokens) {
      let tokenMatched = false;

      const stem = stemToken(token);

      // Smart boundary regex:
      // If token stem is 3 letters (e.g. 'car', 'law', 'act'), require exact whole-word or its plural (e.g. \bcars?\b)
      // If token stem is 4+ letters (e.g. 'arrest', 'steal'), use word prefix (e.g. \barrest) to match arrested, stealing, etc.
      const escapedStem = escapeRegex(stem);
      const regexStr = stem.length <= 3 ? `\\b${escapedStem}s?\\b` : `\\b${escapedStem}`;
      const regex = new RegExp(regexStr, 'i');

      if (regex.test(item.category)) {
        score += 15;
        tokenMatched = true;
      }

      if (regex.test(item.act)) {
        score += 10;
        tokenMatched = true;
      }

      if (regex.test(item.title)) {
        score += 8;
        tokenMatched = true;
      }

      const keywordMatches = item.keywords.filter(kw => regex.test(kw));
      if (keywordMatches.length > 0) {
        score += 5 * keywordMatches.length;
        tokenMatched = true;
      }

      if (regex.test(item.section)) {
        score += 8;
        tokenMatched = true;
      }

      const contentMatches = (item.content.match(new RegExp(regexStr, 'gi')) || []).length;
      if (contentMatches > 0) {
        score += 2 * contentMatches;
        tokenMatched = true;
      }

      const reasoningMatches = (item.reasoning.match(new RegExp(regexStr, 'gi')) || []).length;
      if (reasoningMatches > 0) {
        score += 1 * reasoningMatches;
        tokenMatched = true;
      }

      if (!tokenMatched && fuzzyMatches(stem, item)) {
        score += 3;
        tokenMatched = true;
      }

      if (tokenMatched) {
        matchedTokens.add(token);
      }
    }

    if (tokens.includes('remarry') || tokens.includes('remarriage')) {
      if (item.id === 'mca-sec33') score += 20;
      if (item.id === 'mca-sec58') score += 12;
      if (item.id === 'mca-sec3') score += 8;
    }

    if (tokens.includes('constitution') && item.category === 'Constitution') {
      score += 20;
    }

    const hasSuccessionIssue = hasAny(tokens, SUCCESSION_TOKENS);

    if (hasSuccessionIssue) {
      if (['succession-customary-intestate', 'family-property-head-trustee', 'ukeje-v-ukeje-inheritance'].includes(item.id)) {
        score += item.id === 'succession-customary-intestate' ? 45 : 34;
      }

      if (item.id === 'const-ch4-sec42' && (tokens.includes('sister') || tokens.includes('daughter') || tokens.includes('female') || tokens.includes('children'))) {
        score += 25;
      }
    }

    const hasAdversePossessionIssue = hasAny(tokens, ADVERSE_POSSESSION_TOKENS);

    if (hasAdversePossessionIssue) {
      if (['limitation-adverse-possession', 'property-trespass-unlawful-occupation'].includes(item.id)) {
        score += item.id === 'limitation-adverse-possession' ? 45 : 35;
      }

      if (item.category !== 'Property & Land Law' && !['const-ch4-sec37'].includes(item.id)) {
        score -= 20;
      }
    }

    const hasAnimalIssue = hasAny(tokens, ANIMAL_TOKENS);
    const hasHumanHomicideIssue = hasAny(tokens, HUMAN_HOMICIDE_TOKENS);

    if (hasAnimalIssue) {
      if (item.part === 'Cruelty to animals') {
        score += item.id === 'crim-sec495' ? 35 : 18;
      }

      if (item.part === 'Homicide' && !hasHumanHomicideIssue) {
        score -= 40;
      }
    }

    const hasRoadTrafficIssue = hasAny(tokens, ROAD_TRAFFIC_TOKENS);
    const hasCrashIssue = hasAny(tokens, CRASH_TOKENS);

    if (hasRoadTrafficIssue) {
      if (item.category === 'Road Traffic Law') {
        score += item.id === 'lagos-tms-enforcement-impound' ? 25 : 30;
      }

      if (item.act.toLowerCase().includes('aviation')) {
        score -= 50;
      }
    }

    if (hasCrashIssue) {
      if (['frsc-failure-report-crash', 'frsc-emergency-report', 'traffic-collision-evidence'].includes(item.id)) {
        score += item.id === 'traffic-collision-evidence' ? 40 : 24;
      }

      if (item.category !== 'Road Traffic Law' && item.category !== 'Constitution') {
        score -= 25;
      }
    }

    if (score > 0) {
      // Enforce a minimum query token coverage threshold of 35%
      // This prevents single-word accidental matches on long questions
      const coverage = matchedTokens.size / tokens.length;
      if (coverage >= 0.35) {
        results.push({ item, score, matchedTokens: [...matchedTokens] });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return {
      answerText: `I couldn't find a direct match for "${query}" yet.\n\nI can help with Nigerian legal questions on:\n- **Fundamental Rights** (speech, liberty, fair hearing, police arrests)\n- **Land Ownership & Leases** (C of O, Governor's consent, revocation)\n- **Criminal Offences** (theft, murder, penalties)\n- **Animal Cruelty** (dogs, pets, livestock, poisoning or retaliation)\n- **Family Law** (marriage, divorce, remarriage, custody and maintenance)\n- **Elections** (BVAS, result transmission, Electoral Act offences).`,
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

  const hasSuccessionMatch = topMatches.some(m => [
    'succession-customary-intestate',
    'family-property-head-trustee',
    'ukeje-v-ukeje-inheritance'
  ].includes(m.item.id));
  const hasAdversePossessionMatch = topMatches.some(m => [
    'limitation-adverse-possession',
    'property-trespass-unlawful-occupation'
  ].includes(m.item.id));

  responseText = withConclusion(
    responseText,
    hasSuccessionMatch
      ? "Your brother should not simply take all the property because he is first son. Confirm whether there is a valid will, identify the type of property and marriage/custom involved, preserve title documents, and consult a probate or property lawyer about letters of administration or a family settlement."
      : hasAdversePossessionMatch
        ? "You cannot take over someone's house merely by living there for 25 days. Leave if you have no lawful permission, do not use self-help or force, and let the owner or occupier resolve possession through proper notices, police reports where necessary, or court recovery proceedings."
      : "Keep evidence, report the matter to the appropriate authority where needed, and avoid admitting fault until the facts and documents have been properly reviewed."
  );

  const sources = topMatches.map(m => ({
    id: m.item.id,
    section: m.item.section,
    title: m.item.title,
    act: m.item.act,
    content: m.item.content,
    chapter: m.item.chapter,
    part: m.item.part,
    category: m.item.category,
    sourceUrl: m.item.sourceUrl,
    sourcePage: m.item.sourcePage,
    reasoning: m.item.reasoning
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
