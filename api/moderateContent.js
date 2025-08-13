// /api/moderateContent.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, contentType = 'confession' } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    const response = await fetch('https://api.tisane.ai/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.TISANE_API_KEY,
      },
      body: JSON.stringify({
        language: "en",
        content: text,
        settings: {
          abuse: true,
          sentiment: true,
          entities: true,
          topics: true,
          parses: true,
          words: true,
          snippets: true,
          explain: true,
          format: 'json'
        },
        filters: {
          abuse: {
            hate_speech: 0.7,
            harassment: 0.7,
            cyberbullying: 0.8,
            personal_attack: 0.7,
            profanity: 0.6
          }
        }
      })
    });

    if (!response.ok) {
      console.error('Tisane API error:', response.status, response.statusText);
      return res.status(500).json({ error: 'Moderation service unavailable' });
    }

    const result = await response.json();

    res.status(200).json(result);

  } catch (error) {
    console.error('Content moderation error:', error);
    res.status(500).json({ error: error.message });
  }
}
