import express from 'express';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/recognize', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          parts: [
            {
              text: "You are an expert in Ecuadorian Sign Language (LSEC). Identify the letter being signed in this image. Respond ONLY with the single character (A-Z) and a confidence score between 0 and 1. If no sign is detected or it's unclear, respond with 'NONE'. Format: LETTER:CONFIDENCE (e.g., A:0.95)"
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
      }
    });

    const text = response.text || "NONE:0";
    const [letter, confidence] = text.trim().split(':');

    res.json({
      letter: letter === 'NONE' ? null : letter,
      confidence: parseFloat(confidence) || 0
    });
  } catch (error: any) {
    console.error('Error in recognition:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, Vite handles the frontend
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
