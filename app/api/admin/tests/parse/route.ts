import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { withAdminAuth, ok, err } from "@/lib/api";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export const POST = withAdminAuth(
  async (request: Request) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return err("Gemini API key not configured.", 500);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("No file uploaded.", 400);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return err("Only PDF and DOCX files are supported.", 400);
    }

    // 1. Save file temporarily to disk (required by File Manager SDK)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const fileManager = new GoogleAIFileManager(apiKey);
      const genAI = new GoogleGenerativeAI(apiKey);

      // 2. Upload to Gemini File API
      const uploadResponse = await fileManager.uploadFile(tempFilePath, {
        mimeType: file.type,
        displayName: file.name,
      });

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json", // Forces JSON output
        }
      });

      const prompt = `You are parsing a Science Olympiad test document. Extract every question including those in images/diagrams. Return a JSON array where each object has:
      - "order": integer
      - "content": question text
      - "type": "MCQ" or "FREE_RESPONSE"
      - "options": [{ "label": "A", "text": "..." }] or null
      - "answerKey": label string or null
      - "points": number (default 1)`;

      // 3. Generate content referencing the uploaded file
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri,
          },
        },
        { text: prompt },
      ]);

      // 4. Parse the structured response
      const questions = JSON.parse(result.response.text());

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      return ok({ questions });

    } catch (e) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return err(`Gemini API error: ${e instanceof Error ? e.message : "Unknown error"}`, 500);
    }
  },
  "parse test file"
);
