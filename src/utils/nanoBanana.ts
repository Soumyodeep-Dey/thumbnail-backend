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

            // Validate that we have an uploaded image (required for this app)
            if (!uploadedImageBase64 || !mimeType) {
                throw new Error('Uploaded image is required for thumbnail generation');
            }

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

            console.log(`Calling Gemini API with model: gemini-2.5-flash-image`);
            console.log(`Prompt length: ${prompt.length}, Image size: ${uploadedImageBase64.length} bytes`);

            // Try the API call with proper error handling
            let response;
            try {
                response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-image",
                    contents: promptContent,
                    config: {
                        responseModalities: ['Image'],
                        imageConfig: {
                            aspectRatio: "16:9", // 1344x768 resolution, 1290 tokens
                        },
                    }
                });
            } catch (apiError: any) {
                console.error('Gemini API call failed:', apiError);
                console.error('API Error details:', {
                    message: apiError?.message,
                    status: apiError?.status,
                    code: apiError?.code,
                    error: apiError?.error,
                });
                throw apiError;
            }

            console.log('Gemini API response received');

            // Extract image data from Gemini response
            const parts = response.candidates?.[0]?.content?.parts;

            if (!parts || parts.length === 0) {
                throw new Error('No content returned from Gemini API');
            }

            let imageData: string | undefined;
            for (const part of parts) {
                if (part.text) {
                    console.log('Gemini response text:', part.text);
                } else if (part.inlineData) {
                    imageData = part.inlineData.data;
                    console.log('Found image data in response');
                    break;
                }
            }

            if (!imageData) {
                console.error('Response parts:', JSON.stringify(parts, null, 2));
                throw new Error('No image data found in Gemini response');
            }

            const buffer = Buffer.from(imageData, "base64");
            const imageUrl = await saveImage(buffer);

            return imageUrl;
        } catch (error: any) {
            console.error(`Image generation API error (attempt ${attempt + 1}/${maxRetries}):`, error);
            console.error('Error details:', {
                message: error?.message,
                status: error?.status,
                code: error?.code,
                error: error?.error,
                stack: error?.stack
            });

            // Check if it's a rate limit error (429) vs quota exhausted
            const isRateLimit = error?.message?.includes('429') ||
                error?.message?.includes('TooManyRequests') ||
                error?.status === 429 ||
                error?.error?.code === 429;

            // Check if it's a quota exhausted error (should not retry)
            const isQuotaExhausted = error?.message?.includes('quota') ||
                error?.message?.includes('Quota exceeded') ||
                error?.error?.message?.includes('quota') ||
                error?.error?.message?.includes('Quota exceeded');

            // If quota is exhausted, don't retry - throw immediately with clear message
            if (isQuotaExhausted) {
                const quotaMessage = 'Your Gemini API quota has been exhausted. Please check your plan and billing details, or wait for the quota to reset.';
                console.error('Quota exhausted - not retrying:', quotaMessage);
                throw new Error(quotaMessage);
            }

            // If it's the last attempt or not a rate limit error, throw
            if (attempt === maxRetries - 1 || !isRateLimit) {
                const errorMessage = error?.message || error?.error?.message || 'Unknown error';
                const fullError = error instanceof Error ? error : new Error(errorMessage);
                console.error('Throwing error:', fullError.message);
                throw fullError;
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
