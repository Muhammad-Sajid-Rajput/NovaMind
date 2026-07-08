// NovaMind — tavilyService.js — Phase 4
import { logger } from '../utils/logger.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export const searchWeb = async (query, options = {}) => {
  const {
    maxResults    = 5,
    searchDepth   = 'basic', // 'basic' or 'advanced'
    includeAnswer = true,
  } = options;

  logger.info('Tavily web search', { query });

  const response = await fetch(TAVILY_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth:   searchDepth,
      max_results:    maxResults,
      include_answer: includeAnswer,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Tavily search failed: ${err.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    answer:  data.answer || null,
    results: (data.results || []).map(r => ({
      title:   r.title,
      url:     r.url,
      content: r.content,
      score:   r.score,
    })),
    query,
  };
};

// Format results for injection into Gemini prompt
export const formatSearchResults = (searchData) => {
  const lines = ['=== Web Search Results ==='];

  if (searchData.answer) {
    lines.push(`Summary: ${searchData.answer}\n`);
  }

  searchData.results.forEach((r, i) => {
    lines.push(`[${i + 1}] ${r.title}`);
    lines.push(`URL: ${r.url}`);
    lines.push(`${r.content}\n`);
  });

  lines.push('=== End of Search Results ===');
  lines.push('Please answer using the above search results and cite URLs.');

  return lines.join('\n');
};
