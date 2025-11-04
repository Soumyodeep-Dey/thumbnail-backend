import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateThumbnailPrompt(
    topic: string,
    style?: string,
    mood?: string
): Promise<string> {
    try {
        const systemPrompt = `You are an expert at creating compelling image generation prompts for YouTube thumbnails. 
Your task is to take a video topic and transform it into a detailed, visually-striking prompt that will generate an eye-catching thumbnail.
Focus on:
- Bold, vibrant colors
- Clear focal points
- High contrast
- Emotional impact
- Professional quality
- YouTube thumbnail best practices (1280x720, readable text areas)`;

        const userPrompt = `Create an image generation prompt for a YouTube thumbnail about: "${topic}"
${style ? `Style preference: ${style}` : ''}
${mood ? `Mood/tone: ${mood}` : ''}

Return ONLY the image generation prompt, nothing else.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 300,
        });

        const prompt = response.choices[0]?.message?.content?.trim();

        if (!prompt) {
            throw new Error('Failed to generate prompt from OpenAI');
        }

        return prompt;
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error('Failed to generate thumbnail prompt');
    }
}
