import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

export async function generateImage(prompt: string): Promise<string> {
    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.NANOBANANA_API_KEY;

        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not configured in environment variables');
        }

        // Initialize Google GenAI with the API key
        const ai = new GoogleGenAI({
            apiKey: apiKey
        });

        // Generate image using Gemini 2.5 Flash Image model
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: prompt,
        });

        // Extract image data from response
        const parts = response.candidates?.[0]?.content?.parts;

        if (!parts || parts.length === 0) {
            throw new Error('No content returned from Gemini API');
        }

        for (const part of parts) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                if (!imageData) {
                    throw new Error('Image data is undefined');
                }
                const buffer = Buffer.from(imageData, "base64");

                // Create a unique filename
                const timestamp = Date.now();
                const filename = `thumbnail-${timestamp}.png`;
                const uploadsDir = path.join(process.cwd(), 'uploads');                // Create uploads directory if it doesn't exist
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const filepath = path.join(uploadsDir, filename);
                fs.writeFileSync(filepath, buffer);

                console.log(`Image saved as ${filename}`);

                // Return the full URL that can be accessed from frontend
                const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
                return `${baseUrl}/uploads/${filename}`;
            }
        } throw new Error('No image data found in Gemini response');
    } catch (error) {
        console.error('Gemini API error:', error);
        if (error instanceof Error) {
            throw new Error(`Image generation failed: ${error.message}`);
        }
        throw new Error('Failed to generate image');
    }
}
