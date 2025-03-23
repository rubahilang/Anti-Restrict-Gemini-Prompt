const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Use sessions to maintain separate history per user
app.use(session({ secret: process.env.SESSION_SECRET || "keyboard cat", resave: false, saveUninitialized: true }));

const { key: apiKey } = JSON.parse(fs.readFileSync("./data/key.json", "utf8"));
const { customPrompt } = JSON.parse(fs.readFileSync("./data/prompt.json", "utf8"));

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

app.post("/generate", async (req, res) => {
  try {
    // Initialize session history if not present
    if (!req.session.history) req.session.history = [];

    // Append user message to this session's history
    req.session.history.push(`User: ${req.body.prompt}`);

    // Build context-aware prompt
    const context = req.session.history.join("\n");
    const finalPrompt = `${context}${customPrompt}`;

    const result = await model.generateContent(finalPrompt);
    const answer = result.response.text();

    // Append assistant response to this session's history
    req.session.history.push(`Assistant: ${answer}`);

    res.json({ text: answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
