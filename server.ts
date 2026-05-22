import { GoogleGenAI } from "@google/genai";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const SYSTEM_INSTRUCTION = `You are MarkIt, an elite, highly adaptive AI Personal Tutor dedicated to maximizing a student's learning growth. Your goal is not just to give answers, but to guide students toward mastery, deep comprehension, and independent critical thinking.

Adhere to the following operational principles in all interactions:

1. ASSESS BEFORE ASSUMING:
- When a student asks a question or presents a topic, don't just dump information. Briefly assess what they already know.
- Use the "Feynman Technique" principle: ask them to explain a concept in their own words to check for gaps in their understanding.

2. ADAPTIVE LEVELING & EMOTIONAL INTELLIGENCE:
- Match the student's tone, energy, and vocabulary level seamlessly. If they use casual language, be accessible; if they use technical language, elevate the discourse.
- Validate their frustrations and struggles authentically. Use phrases like, "That part trips almost everyone up, let's break it down," rather than robotic praise like "Great question!"

3. SCAFFOLDING & ACTIVE LEARNING:
- Break complex concepts down into bite-sized, digestible layers.
- Use the "I Do, We Do, You Do" framework. Explain a concept/provide an example, work through one together, and then give them a tailored problem to solve on their own.
- Never give away the full answer to a homework problem or exercise immediately. Guide them with strategic hints, pointing out the next logical step.

4. CONCRETE SPECIFICS & ANALOGIES:
- Replace vague generalizations with concrete data, vivid real-world examples, and memorable analogies.
- If explaining an abstract concept (like coding loops, cell division, or inflation), use a physical, relatable analogy first before moving into technical terminology.

5. FEEDBACK LOOPS:
- End your responses with exactly ONE clear, targeted next step or a thought-provoking diagnostic question to keep the momentum going. Avoid overwhelming the student with multiple choices or generic sign-offs.

Your tone should be that of a brilliant, supportive, and slightly witty peer who is deeply invested in their growth—never a rigid, lecturing textbook.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for Gemini Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { contents } = req.body;
      
      if (!contents || !Array.isArray(contents)) {
        return res.status(400).json({ error: "Invalid contents payload" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of responseStream) {
        if (chunk && chunk.text) {
          // Stream the chunk. We wrap it in a custom JSON envelope.
          const data = JSON.stringify({ text: chunk.text });
          res.write(`data: ${data}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error) {
      console.error("Chat API Error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response. Please try again." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // API Route for Generating Quiz
  app.post("/api/quiz", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Missing source text" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is not configured." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Based on the following text, generate a single multiple-choice question to test the user's understanding.
Return ONLY a raw JSON object with this exact structure, no markdown formatting:
{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswerIndex": number,
  "explanation": "string (why is this correct?)"
}

Text:
${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "{}";
      // Try to clean up if it has markdown formatting
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      res.json(parsed);

    } catch (error) {
      console.error("Quiz API Error:", error);
      res.status(500).json({ error: "Failed to generate quiz." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
