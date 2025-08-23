// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Load environment variables from .env
dotenv.config();

const app = express();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false,
  })
);
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express API!" });
});

app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text' field" });

    const readableStream = await elevenlabs.textToSpeech.convert(
      "NL3wAdhrhsFZAoDTBMHk",
      {
        outputFormat: "mp3_44100_128",
        text,
        modelId: "eleven_v3",
      }
    );

    const reader = readableStream.getReader();
    const chunks: Uint8Array[] = [];
    let result;
    while (!(result = await reader.read()).done) {
      chunks.push(result.value);
    }
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="speech.mp3"',
    });
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/openaitranslate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text' field" });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
            You are a precise English ↔ Cebuano (Bisaya) translator.
            Return ONLY valid JSON with exactly these keys and types:
            {
              "translateToBisaya": boolean,
              "translatedText": string,
              "isSentence": boolean,
              "sentenceExampleOriginal": string | null,
              "sentenceExampleTranslated": string | null
            }
            Rules:
            - Detect the input language (English or Cebuano) automatically.
            - "translateToBisaya" = true only if input is English; false if input is Cebuano.
            - "translatedText" = input translated into the opposite language.
            - "isSentence" = true if the input is a full sentence (has a verb or clear clause); false for a word/short phrase.
            - If "isSentence" = false, produce a simple example sentence in the original language using the input in context, and provide its translation.
            - If "isSentence" = true, set both example fields to null.
            - No extra commentary, no markdown, no trailing commas.
            - The output.text MUST BE PARSEABLE BY JSON.PARSE() NO MATTER WHAT DO NOT BREAK THIS FORMAT
            - If you are unable to process the request, instead create the JSON { "isError": true, "message": "reason" }
          `,
        },
        { role: "user", content: text },
      ],
    });

    res.send({ data: response.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
