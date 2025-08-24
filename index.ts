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

app.post("/openaisentence", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing 'text' field" });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      frequency_penalty: 0.2,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `
                    You are an English ↔ Cebuano (Bisaya) tutor.
                    Return ONLY valid JSON with exactly these keys and types:
                    {
                      "bisaya": string,
                      "english": string
                    }
                    Rules:
                    - Generate a Bisaya sentence following the CEFR Language Level System (A1, A2, B1, B2, C1, C2).
                    - The CEFR level will be provided by the user input.
                    - Avoid repeating common phrases; vary vocabulary and sentence structures for better learning.
                    - No extra commentary, no markdown, no trailing commas.
                    - The output MUST be parseable by JSON.parse().
                    - Use more randomness and creativity while keeping the sentence appropriate for the given level.
          `,
        },
        { role: "user", content: text },
      ],
    });

    res.send({ data: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/openaiguess", async (req, res) => {
  try {
    const { original, guess } = req.body;
    if (!original && !guess)
      return res.status(400).json({ error: "Missing 'text' field" });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
            You are a Bisaya Tutor to English Speakers
            You are going to be given a string in Bisaya and a user's response in either Bisaya or English
            Return ONLY valid JSON with exactly these keys and types:
            {
              correct: boolean,
              feedback: string
            }
            Rules:
            - Based off the user's response, if the user's input has the same meaning as the original Bisaya String regardless of it being in English or Bisaya, return correct as True
            - Regardless if they are correct or not give them feedback. 
            - If they are correct, give them praise and maybe explain what some of the words or grammar means. 
            - If they are wrong, tell them what they got wrong, and give them the english translations of the words in the original Bisaya Questions that could help them understand more or anything else you think would help them learn more.
            - No extra commentary, no markdown, no trailing commas.
            - The output.text MUST BE PARSEABLE BY JSON.PARSE() NO MATTER WHAT DO NOT BREAK THIS FORMAT.
          `,
        },
        {
          role: "user",
          content: `Original Bisaya Sentence: ${original}. User's Guess: ${guess}`,
        },
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
