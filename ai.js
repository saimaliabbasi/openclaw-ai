/* ═══════════════════════════════════════════
   OpenClaw — AI Orchestrator (Using Groq API - 100% Free)
   ═══════════════════════════════════════════ */

const OpenAI = require('openai');
const { searchBusinesses } = require('./tools/search');
const { extractBusinessName, cleanWebsite, deduplicateLeads } = require('./tools/nanobots');

// Initialize OpenAI client but point to Groq for free usage!
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY, 
  baseURL: 'https://api.groq.com/openai/v1', // 100% Free API endpoint
});

// Using a fast model from Groq
const MODEL = 'llama3-70b-8192';

async function runOrchestrator(userQuery) {
  console.log(`[AI Orchestrator] Analyzing query: "${userQuery}"`);
  
  // 1. Planning Phase (Deciding what to do)
  const tools = [
    {
      type: "function",
      function: {
        name: "search_web",
        description: "Search the web for businesses, leads, or specific information.",
        parameters: {
          type: "object",
          properties: {
            search_query: { type: "string", description: "The optimized search query for the tool" },
            max_results: { type: "integer", description: "Number of results to fetch (default 10)" }
          },
          required: ["search_query"]
        }
      }
    }
  ];

  const messages = [
    { role: "system", content: "You are the OpenClaw AI Orchestrator. Your job is to analyze user requests and use the 'search_web' tool to find leads. You output tool calls." },
    { role: "user", content: userQuery }
  ];

  try {
    console.log(`[AI] Asking ${MODEL} to plan...`);
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: messages,
      tools: tools,
      tool_choice: "auto"
    });

    const responseMessage = response.choices[0].message;
    let rawData = [];

    // 2. Execution Phase (Running tools)
    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "search_web") {
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[AI] Tool call -> search_web("${args.search_query}")`);
          
          // Call Tavily Search API
          rawData = await searchBusinesses(args.search_query, args.max_results || 10);
        }
      }
    } else {
      // Fallback if AI didn't use tool
      console.log(`[AI] No tool call generated. Defaulting to direct search...`);
      rawData = await searchBusinesses(userQuery, 10);
    }

    // 3. Processing Phase (Formatting results with AI)
    if (!rawData || rawData.length === 0) return [];
    
    return await formatLeads(rawData, userQuery);

  } catch (error) {
    console.error("[Orchestrator Error]", error);
    throw new Error("AI Orchestration failed. Check API keys.");
  }
}

async function formatLeads(rawData, originalQuery) {
  console.log(`[AI] Formatting ${rawData.length} raw results...`);
  
  // Create a strict JSON schema prompt to force structured output
  const truncatedData = JSON.stringify(rawData).substring(0, 4000);
  const prompt = `
You are a Data Formatting AI (PicoClaw).
The user requested: "${originalQuery}"

Extract business entities from the following raw search data and return them in a STRICT JSON array.
Extract 'name', 'website', 'address', 'phone', and 'email' if available. If not found, use "N/A".

RAW DATA:
${truncatedData}

OUTPUT FORMAT — return ONLY this JSON array, no extra text, no markdown:
[
  { "name": "Company X", "email": "contact@company.com", "phone": "123-456", "website": "https://example.com", "address": "City, Country" }
]
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        { role: "system", content: "You are a data extraction AI. You only output valid JSON arrays. No markdown, no explanation." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1
    });

    let content = response.choices[0].message.content.trim();

    // Strip any markdown code fences the model may have added
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // Extract the JSON array if the model added extra text around it
    const arrayMatch = content.match(/(\[.*\])/s);
    if (arrayMatch) content = arrayMatch[1];

    let parsedLeads = JSON.parse(content);
    if (!Array.isArray(parsedLeads)) parsedLeads = [parsedLeads];
    
    // 4. Nanobot Phase (Final cleaning)
    const cleanedLeads = parsedLeads.map(lead => ({
      name: extractBusinessName(lead.name),
      email: lead.email || "N/A",
      phone: lead.phone || "N/A",
      website: cleanWebsite(lead.website),
      address: lead.address || "N/A"
    }));

    const finalLeads = deduplicateLeads(cleanedLeads);
    console.log(`[AI] Formatting complete. Returning ${finalLeads.length} leads.`);
    
    return finalLeads;

  } catch (error) {
    console.error("[Formatting Error]", error);
    console.log("Falling back to basic parsing...");
    return rawData.map(r => ({ name: r.title, website: r.url, email: 'N/A', phone: 'N/A', address: 'N/A' }));
  }
}

async function generateEmailTemplate(leads) {
  const context = (leads && leads.length > 0 && leads[0].name) ? leads[0].name : "a potential partner";

  const response = await openai.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: "system", content: "You are an expert sales copywriter. Output ONLY a valid JSON object with 'subject' (string) and 'body' (string) keys. No markdown, no extra text." },
      { role: "user", content: `Write a short, friendly cold email to ${context} offering AI automation services. Output JSON only.` }
    ],
    temperature: 0.7
  });

  let raw = response.choices[0].message.content.trim();
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const objMatch = raw.match(/(\{.*\})/s);
  if (objMatch) raw = objMatch[1];

  return JSON.parse(raw);
}

module.exports = { runOrchestrator, generateEmailTemplate };
