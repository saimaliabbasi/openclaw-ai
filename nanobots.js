/* ═══════════════════════════════════════════
   OpenClaw — Nanobots (Small Worker Functions)
   ═══════════════════════════════════════════ */

/**
 * Nanobot 1: Clean business names (remove LLC, Inc, etc. for better emails)
 */
function extractBusinessName(rawName) {
  if (!rawName) return "Unknown";
  
  // Remove legal entities for friendlier names
  return rawName
    .replace(/\b(LLC|Inc|Corp|Ltd|Co|Company)\.?\b/gi, '')
    .replace(/[^\w\s-]/gi, '')
    .trim();
}

/**
 * Nanobot 2: Normalize website URLs
 */
function cleanWebsite(url) {
  if (!url || url === "N/A") return "N/A";
  
  try {
    let cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    
    const parsed = new URL(cleanUrl);
    return parsed.origin; // Returns just the base domain e.g. https://example.com
  } catch (e) {
    return url;
  }
}

/**
 * Nanobot 3: Deduplicate leads based on domain or name
 */
function deduplicateLeads(leads) {
  const seen = new Set();
  
  return leads.filter(lead => {
    // Determine unique key (domain is best, fallback to name)
    let key = '';
    
    if (lead.website && lead.website !== "N/A") {
      try { key = new URL(lead.website).hostname; } 
      catch (e) { key = lead.website; }
    } else {
      key = (lead.name || 'unknown').toLowerCase();
    }
    
    if (seen.has(key)) {
      return false; // Duplicate
    } else {
      seen.add(key);
      return true; // Keep
    }
  });
}

module.exports = {
  extractBusinessName,
  cleanWebsite,
  deduplicateLeads
};
