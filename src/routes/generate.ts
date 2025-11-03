import { Router, type Request, type Response } from 'express';
import { generateThumbnailPrompt } from '../utils/openaiPrompt.js';
import { generateImage } from '../utils/nanoBanana.js';

const router = Router();

// POST /api/generate/thumbnail
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
