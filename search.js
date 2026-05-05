/* ═══════════════════════════════════════════
   OpenClaw — Search Tool (Tavily)
   ═══════════════════════════════════════════ */

const { tavily } = require('@tavily/core');

async function searchBusinesses(query, maxResults = 10) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ No TAVILY_API_KEY found. Returning mock data.");
    return [
      { title: "Mock Business 1", url: "https://mock1.com", content: "Great business in the area." },
      { title: "Mock Business 2", url: "https://mock2.com", content: "Another great local business." }
    ];
  }

  try {
    const tvly = tavily({ apiKey });
    
    console.log(`[Tavily] Searching: "${query}" (max: ${maxResults})`);
    
    // Using advanced search depth to get better snippets/data
    const response = await tvly.search(query, {
      search_depth: "advanced",
      max_results: maxResults
    });

    return response.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content
    }));

  } catch (error) {
    console.error("[Tavily Error]", error);
    throw new Error("Web search failed.");
  }
}

module.exports = { searchBusinesses };
