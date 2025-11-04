import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateImage(prompt: string, uploadedImageBase64?: string, mimeType?: string): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const apiKey = process.env.GOOGLE_API_KEY;

            if (!apiKey) {
                throw new Error('GOOGLE_API_KEY is not configured in environment variables');
            }

            // Initialize Google GenAI with the API key
            const ai = new GoogleGenAI({
                apiKey: apiKey
            });

            // Build the prompt array with text and optional image
            const promptContent: any[] = [
                { text: prompt }
            ];

            // If an uploaded image is provided, add it to the prompt
            if (uploadedImageBase64 && mimeType) {
                promptContent.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: uploadedImageBase64,
                    },
                });
            }

            // Generate image using Gemini 2.5 Flash Image model
            // 16:9 aspect ratio (1344x768) uses 1290 tokens per generation
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents: promptContent,
                config: {
                    responseModalities: ['Image'],
                    imageConfig: {
                        aspectRatio: "16:9", // 1344x768 resolution, 1290 tokens
                    },
                }
            });

            // Extract image data from response
            const parts = response.candidates?.[0]?.content?.parts;

            if (!parts || parts.length === 0) {
                throw new Error('No content returned from Gemini API');
            }

            for (const part of parts) {
                if (part.text) {
                    console.log('Gemini response:', part.text);
                } else if (part.inlineData) {
                    const imageData = part.inlineData.data;
                    if (!imageData) {
                        throw new Error('Image data is undefined');
                    }
                    const buffer = Buffer.from(imageData, "base64");

                    // Create a unique filename
                    const timestamp = Date.now();
                    const random = Math.floor(Math.random() * 1000);
                    const filename = `thumbnail-${timestamp}-${random}.png`;
                    const uploadsDir = path.join(process.cwd(), 'uploads');

                    // Create uploads directory if it doesn't exist
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
            }

            throw new Error('No image data found in Gemini response');
        } catch (error: any) {
            console.error(`Gemini API error (attempt ${attempt + 1}/${maxRetries}):`, error);

            // Check if it's a rate limit error
            const isRateLimit = error?.message?.includes('429') ||
                error?.message?.includes('TooManyRequests') ||
                error?.status === 429;

            // If it's the last attempt or not a rate limit error, throw
            if (attempt === maxRetries - 1 || !isRateLimit) {
                if (error instanceof Error) {
                    throw new Error(`Image generation failed: ${error.message}`);
                }
                throw new Error('Failed to generate image');
            }

            // Wait before retrying (exponential backoff)
            const delayTime = baseDelay * Math.pow(2, attempt);
            console.log(`Rate limited. Retrying in ${delayTime}ms...`);
            await delay(delayTime);
        }
    }

    throw new Error('Failed to generate image after all retries');
}
