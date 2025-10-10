// /api/moderateContent.js
// ❌ no import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, contentType = 'confession' } = req.body || {};
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  // Compose a strict JSON schema moderation prompt
  const instruction = `You are a content moderation system for an anonymous confession app. Analyze the user text and output STRICT JSON only. No prose.
Return this JSON shape:
{
  "isNSFW": boolean,
  "issues": [ { "type": string, "severity": "low"|"medium"|"high", "text": string } ],
  "categories": {
    "hate_speech": number, "harassment": number, "bullying": number,
    "self_harm": number, "sexual_content": number, "violence": number,
    "profanity": number, "personal_attack": number, "personal_data": number,
    "spam": number, "illegal": number, "other": number
  }
}
Rules:
- Set category scores from 0.0 to 1.0 (likelihood).
- Consider content NSFW if any serious category likelihood >= 0.6 or clear violation exists.
- issues[] should include each concrete violation you detect with a short excerpt in "text".
- Be conservative for minors and sexual content.
`;

  const userText = `ContentType: ${contentType}\nText: ${text}`;

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: instruction + '\n\n' + userText }] }
        ],
        generationConfig: { temperature: 0 }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Gemini API error:', response.status, response.statusText, body);
      return res.status(502).json({ error: 'Moderation service unavailable' });
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const partText = candidate?.content?.parts?.[0]?.text || '';

    // Try to parse JSON from the model response
    let parsed;
    try {
      // Some models wrap JSON in markdown code fences
      const cleaned = partText.trim().replace(/^```json\n|^```\n|```$/g, '');
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse Gemini moderation JSON:', e, partText);
      return res.status(502).json({ error: 'Invalid response from moderation model' });
    }

    // Normalize payload
    const categories = parsed.categories || {};
    const issues = Array.isArray(parsed.issues) ? parsed.issues.map(it => ({
      type: String(it.type || 'other'),
      severity: ['low','medium','high'].includes(it.severity) ? it.severity : 'low',
      text: String(it.text || '')
    })) : [];

    const responseBody = {
      model: 'gemini-1.5-flash',
      isNSFW: Boolean(parsed.isNSFW) || issues.length > 0 && Object.values(categories).some(v => (typeof v === 'number' ? v : 0) >= 0.6),
      issues,
      categories,
    };

    return res.status(200).json(responseBody);

  } catch (error) {
    console.error('Content moderation error:', error);
    return res.status(500).json({ error: error.message || 'Moderation failed' });
  }
}
