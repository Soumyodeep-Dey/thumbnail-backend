import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to save image buffer to file
async function saveImage(buffer: Buffer): Promise<string> {
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

            let imageUrl: string;

            // If an uploaded image is provided, use Gemini (supports image input)
            // Otherwise, use Imagen (text-to-image only)
            if (uploadedImageBase64 && mimeType) {
                // Use Gemini 2.5 Flash Image model for image-to-image generation
                const promptContent: any[] = [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: uploadedImageBase64,
                        },
                    }
                ];

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

                // Extract image data from Gemini response
                const parts = response.candidates?.[0]?.content?.parts;

                if (!parts || parts.length === 0) {
                    throw new Error('No content returned from Gemini API');
                }

                let imageData: string | undefined;
                for (const part of parts) {
                    if (part.text) {
                        console.log('Gemini response:', part.text);
                    } else if (part.inlineData) {
                        imageData = part.inlineData.data;
                        break;
                    }
                }

                if (!imageData) {
                    throw new Error('No image data found in Gemini response');
                }

                const buffer = Buffer.from(imageData, "base64");
                imageUrl = await saveImage(buffer);
            } else {
                // Use Imagen model for text-to-image generation (no image input)
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        aspectRatio: "16:9", // YouTube thumbnail aspect ratio
                    },
                });

                if (!response.generatedImages || response.generatedImages.length === 0) {
                    throw new Error('No images generated from Imagen API');
                }

                // Get the first generated image
                const generatedImage = response.generatedImages[0];
                if (!generatedImage?.image?.imageBytes) {
                    throw new Error('Image bytes not found in Imagen response');
                }

                const buffer = Buffer.from(generatedImage.image.imageBytes, "base64");
                imageUrl = await saveImage(buffer);
            }

            return imageUrl;
        } catch (error: any) {
            console.error(`Image generation API error (attempt ${attempt + 1}/${maxRetries}):`, error);

            // Check if it's a rate limit error
            const isRateLimit = error?.message?.includes('429') ||
                error?.message?.includes('TooManyRequests') ||
                error?.status === 429 ||
                error?.error?.code === 429;

            // If it's the last attempt or not a rate limit error, throw
            if (attempt === maxRetries - 1 || !isRateLimit) {
                if (error instanceof Error) {
                    throw new Error(`Image generation failed: ${error.message}`);
                }
                throw new Error('Failed to generate image');
            }

            // Try to extract retry delay from error response (format: "48.093654311s")
            let delayTime = baseDelay;
            try {
                const errorDetails = error?.error?.details;
                if (errorDetails && Array.isArray(errorDetails)) {
                    const retryInfo = errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'));
                    if (retryInfo?.retryDelay) {
                        // Parse delay string (e.g., "48.093654311s") and convert to milliseconds
                        const delayStr = retryInfo.retryDelay.toString().replace('s', '');
                        delayTime = parseFloat(delayStr) * 1000;
                        console.log(`API suggests retry delay: ${Math.round(delayTime / 1000)}s`);
                    }
                }
            } catch (e) {
                // Fallback to exponential backoff if we can't parse the delay
                delayTime = baseDelay * Math.pow(2, attempt);
            }

            console.log(`Rate limited. Retrying in ${Math.round(delayTime / 1000)}s...`);
            await delay(delayTime);
        }
    }

    throw new Error('Failed to generate image after all retries');
}
