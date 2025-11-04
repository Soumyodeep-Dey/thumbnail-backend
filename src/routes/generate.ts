import { Router, type Request, type Response } from 'express';
import { generateThumbnailPrompt } from '../utils/openaiPrompt.js';
import { generateImage } from '../utils/nanoBanana.js';
import { upload } from '../utils/multerConfig.js';
import { generatePromptVariations } from '../utils/imageProcessor.js';

const router = Router();

// POST /api/generate-thumbnails (matches frontend)
router.post('/generate-thumbnails', upload.single('photo'), async (req: Request, res: Response) => {
    try {
        const { videoType, style, mood, placement } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Photo is required' });
        }

        // Convert uploaded image to base64 for Gemini
        const photoBase64 = file.buffer.toString('base64');

        // Create a description based on the video type
        const photoDescription = `Photo uploaded for ${videoType || 'YouTube'} thumbnail`;

        // Generate 1 prompt variation for testing (we'll generate images sequentially to avoid rate limits)
        const promptVariations = generatePromptVariations(
            photoDescription,
            videoType || 'YouTube video',
            style || 'professional',
            mood || 'engaging',
            placement || 'center'
        );

        // Generate thumbnails using OpenAI-enhanced prompts (testing with 1 image first)
        const thumbnails: string[] = [];

        // Only use the first prompt variation for testing
        if (promptVariations.length === 0) {
            throw new Error('Failed to generate prompt variations');
        }

        const basePrompt = promptVariations[0]!;
        try {
            // Enhance prompt with OpenAI
            const enhancedPrompt = await generateThumbnailPrompt(
                basePrompt,
                style,
                mood
            );

            // Generate image using Gemini with the uploaded photo
            const imageUrl = await generateImage(enhancedPrompt, photoBase64, file.mimetype);
            thumbnails.push(imageUrl);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            throw error; // Throw error since we're only generating one image
        }

        if (thumbnails.length === 0) {
            throw new Error('Failed to generate any thumbnails');
        }

        res.status(200).json({
            thumbnails,
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
