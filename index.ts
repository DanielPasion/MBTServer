// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Load environment variables from .env
dotenv.config();

const app = express();

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

    // Read the stream into a Buffer
    const reader = readableStream.getReader();
    const chunks: Uint8Array[] = [];
    let result;
    while (!(result = await reader.read()).done) {
      chunks.push(result.value);
    }
    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

    // Send back audio
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
