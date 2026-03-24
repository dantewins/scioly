import { GoogleGenerativeAI } from "@google/generative-ai"

import { withAdminAuth, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

// Allowed file types for test upload
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
]

// POST /api/admin/tests/parse — upload a PDF/DOCX and extract questions via Gemini
export const POST = withAdminAuth(
  async (request: Request) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return err("Gemini API key not configured.", 500)

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return err("No file uploaded.", 400)

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return err("Only PDF and DOCX files are supported.", 400)
    }

    // Convert to base64 for the Gemini inline data API
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")

    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" })

    const prompt = `You are parsing a Science Olympiad test document. Extract every question and return ONLY a valid JSON array — no markdown, no commentary, just the JSON.

Each object in the array must have:
- "order": integer (1-indexed)
- "content": the question text (string)
- "type": "MCQ" if it has answer choices, "FREE_RESPONSE" otherwise
- "options": for MCQ, an array of { "label": "A", "text": "..." } objects (one per choice); null for FREE_RESPONSE
- "answerKey": for MCQ, the correct label ("A", "B", "C", etc.); for FREE_RESPONSE, the model answer text or null if not present
- "points": point value if stated, otherwise 1

If you cannot determine the answer key for a question, set answerKey to null.
Return only the JSON array, starting with [ and ending with ].`

    let result
    try {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: file.type === "application/pdf" ? "application/pdf" : "application/octet-stream",
            data: base64,
          },
        },
      ])
    } catch (e) {
      return err(`Gemini API error: ${e instanceof Error ? e.message : "Unknown error"}`, 500)
    }

    const text = result.response.text().trim()

    // Strip markdown code fences if present
    const jsonText = text.startsWith("```")
      ? text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
      : text

    let questions: unknown
    try {
      questions = JSON.parse(jsonText)
    } catch {
      return err("Failed to parse Gemini response as JSON.", 500)
    }

    if (!Array.isArray(questions)) {
      return err("Gemini returned unexpected format.", 500)
    }

    return ok({ questions })
  },
  "parse test file"
)
