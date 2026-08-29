export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "PDF text is missing" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing"
      });
    }

    const prompt = `
Create a 45-60 second Hindi educational YouTube Short from the chapter below.

Requirements:
- Strong hook
- Simple Hindi
- 6 to 8 scenes
- Each scene needs narration and visual
- Suitable for a vertical 9:16 video
- Do not invent facts

Return ONLY valid JSON:

{
  "title": "Short title",
  "scenes": [
    {
      "narration": "Hindi narration",
      "visual": "Visual description"
    }
  ]
}

Chapter:
${text.substring(0, 30000)}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
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
        error: data?.error?.message || "Gemini API error"
      });
    }

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) {
      return res.status(500).json({
        error: "Gemini returned no output"
      });
    }

    const result = JSON.parse(output);

    return res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
  }
