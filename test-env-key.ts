import { GoogleGenAI } from '@google/genai';

async function test() {
  process.env.GEMINI_API_KEY = 'real_key_here'; // Mocking
  try {
    const ai = new GoogleGenAI({ apiKey: 'fake_key_12345' });
    console.log(ai.apiKey);
  } catch (error) {
    console.error('Error caught:', error);
  }
}

test();
