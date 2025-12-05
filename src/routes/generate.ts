import { Router, type Request, type Response } from 'express';
import { generateThumbnailPrompt } from '../utils/openaiPrompt.js';
import { generateImage } from '../utils/nanoBanana.js';
import { upload } from '../utils/multerConfig.js';

const router = Router();

// POST /api/generate-thumbnails (matches frontend)
// Flow: User input → 1 OpenAI call → 1 Gemini call
router.post('/generate-thumbnails', upload.single('photo'), async (req: Request, res: Response) => {
    try {
        const { videoType, style, mood, placement } = req.body;
        const file = req.file;

        // Validate all required fields
        if (!file) {
            return res.status(400).json({ error: 'Photo is required' });
        }
        if (!videoType || !style || !mood || !placement) {
            return res.status(400).json({
                error: 'All fields are required: videoType, style, mood, and placement'
            });
        }

        // Convert uploaded image to base64 for Gemini
        const photoBase64 = file.buffer.toString('base64');

        // Create base prompt from user input (no API call - just string manipulation)
        const basePrompt = `YouTube thumbnail for ${videoType} video, ${style} style, ${mood} mood, subject positioned ${placement}, vibrant colors, high contrast, professional lighting, 4K quality`;

        console.log('Step 1: User input received - all fields validated');

        // Step 2: ONE OpenAI call to enhance the prompt
        console.log('Step 2: Calling OpenAI to enhance prompt...');
        const enhancedPrompt = await generateThumbnailPrompt(
            basePrompt,
            style,
            mood
        );
        console.log('Step 2: OpenAI prompt enhancement completed');

        // Step 3: ONE Gemini call to generate the image
        console.log('Step 3: Calling Gemini/Banana to generate image...');
        const imageUrl = await generateImage(enhancedPrompt, photoBase64, file.mimetype);
        console.log('Step 3: Image generation completed');

        res.status(200).json({
            thumbnails: [imageUrl],
        });
    } catch (error) {
        console.error('Error generating thumbnails:', error);
        res.status(500).json({
            error: 'Failed to generate thumbnails',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Keep the original text-based endpoint for backward compatibility
router.post('/thumbnail', async (req: Request, res: Response) => {
    try {
        const { topic, style, mood } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Generate optimized prompt using OpenAI
        const optimizedPrompt = await generateThumbnailPrompt(topic, style, mood);

        // Generate image using NanoBanana API
        const imageUrl = await generateImage(optimizedPrompt);

        res.status(200).json({
            success: true,
            prompt: optimizedPrompt,
            imageUrl,
        });
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        res.status(500).json({
            error: 'Failed to generate thumbnail',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
