const express = require("express");
const router = express.Router();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const TAVILY_API_URL = "https://api.tavily.com/search";

// POST /api/search — 用 Tavily 搜尋真實新聞
router.post("/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 12,
        include_published_date: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Tavily error");
    res.json(data);
  } catch (err) {
    console.error("Tavily error:", err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// POST /api/messages — 呼叫 Claude
router.post("/messages", async (req, res) => {
  const { model, max_tokens, messages, tools } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const body = {
    model: model || "claude-sonnet-4-6",
    max_tokens: max_tokens || 3000,
    messages,
  };
  if (Array.isArray(tools) && tools.length > 0) body.tools = tools;

  const headers = {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Anthropic error:", data?.error?.message);
      return res.status(response.status).json({ error: data?.error || data });
    }
    res.json(data);
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;
