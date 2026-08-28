export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const prompt = `
Create a 45-60 second Hindi educational YouTube Shorts script from this chapter.

Rules:
- Start with an interesting hook.
- Use simple Hindi.
- Explain the most important points.
- Give short narration sentences.
- Create 6-8 scenes.
- For every scene provide narration and visual suggestion.
- Do not invent facts.

Return JSON only:
{
  "title": "Short title",
  "scenes": [
    {
      "narration": "voice-over",
      "visual": "visual description"
    }
  ]
}

Chapter:
${text.substring(0, 30000)}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API error"
      });
    }

    const output =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) {
      return res.status(500).json({
        error: "Gemini returned no output"
      });
    }

    return res.status(200).json({
      result: JSON.parse(output)
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
    }
