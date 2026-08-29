export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "PDF text is missing"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel"
      });
    }

    const prompt = `
You are an expert educational YouTube Shorts script writer.

Read the chapter text below and create a 45-60 second Hindi educational YouTube Short.

Requirements:
- Start with a strong hook.
- Use simple, natural Hindi.
- Explain the most important concepts.
- Make 6 to 8 short scenes.
- Each scene must contain narration and a visual suggestion.
- Narration should sound natural when spoken aloud.
- Visual suggestions should be suitable for a vertical 9:16 educational video.
- Do not invent information that is not supported by the chapter.
- End with a quick revision.

Return ONLY valid JSON in exactly this format:

{
  "title": "Short title",
  "scenes": [
    {
      "narration": "Hindi voice-over",
      "visual": "Visual description"
    }
  ]
}

Chapter text:
${text.substring(0, 30000)}
`;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, {
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
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed"
      });
    }

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) {
      return res.status(500).json({
        error: "Gemini returned empty response"
      });
    }

    let result;

    try {
      result = JSON.parse(output);
    } catch (parseError) {
      console.error("JSON parse error:", output);

      return res.status(500).json({
        error: "Gemini returned invalid JSON"
      });
    }

    return res.status(200).json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
      }
