import axios from 'axios';

const NANOBANANA_API_URL = 'https://api.nanobanana.ai/v1/images/generations';

interface NanoBananaResponse {
    data: Array<{
        url: string;
    }>;
}

export async function generateImage(prompt: string): Promise<string> {
    try {
        const apiKey = process.env.NANOBANANA_API_KEY;

        if (!apiKey) {
            throw new Error('NANOBANANA_API_KEY is not configured');
        }

        const response = await axios.post<NanoBananaResponse>(
            NANOBANANA_API_URL,
            {
                prompt,
                model: 'flux-pro',
                width: 1280,
                height: 720,
                steps: 30,
                guidance_scale: 7.5,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000, // 60 second timeout
            }
        );

        const imageUrl = response.data?.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error('No image URL returned from NanoBanana API');
        }

        return imageUrl;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('NanoBanana API error:', error.response?.data || error.message);
            throw new Error(`NanoBanana API error: ${error.response?.data?.error || error.message}`);
        }
        console.error('Error generating image:', error);
        throw new Error('Failed to generate image');
    }
}
