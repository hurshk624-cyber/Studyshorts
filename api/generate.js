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
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          model: "gemini-3.6-flash",

          input: prompt,

          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string"
                },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      narration: {
                        type: "string"
                      },
                      visual: {
                        type: "string"
                      }
                    },
                    required: [
                      "narration",
                      "visual"
                    ]
                  }
                }
              },
              required: [
                "title",
                "scenes"
              ]
            }
          },

          generation_config: {
            thinking_level: "low",
            max_output_tokens: 4000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.message ||
          "Gemini API error",
        details: data
      });
    }

    let output = "";

    // Find the model's text output
    if (Array.isArray(data?.steps)) {
      for (const step of data.steps) {
        if (
          step?.type === "model_output" &&
          Array.isArray(step?.content)
        ) {
          for (const content of step.content) {
            if (content?.type === "text" && content?.text) {
              output += content.text;
            }
          }
        }
      }
    }

    // Fallback if output_text is returned
    if (!output && data?.output_text) {
      output = data.output_text;
    }

    if (!output) {
      return res.status(500).json({
        error: "Gemini returned no output",
        details: data
      });
    }

    let result;

    try {
      result = JSON.parse(output);
    } catch (parseError) {
      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        raw: output
      });
    }

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
