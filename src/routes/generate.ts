import { Router, type Request, type Response } from 'express';
import { generateThumbnailPrompt } from '../utils/openaiPrompt.js';
import { generateImage } from '../utils/nanoBanana.js';
import { upload } from '../utils/multerConfig.js';
import { bufferToDataURL, generatePromptVariations } from '../utils/imageProcessor.js';

const router = Router();

// POST /api/generate-thumbnails (matches frontend)
router.post('/thumbnails', upload.single('photo'), async (req: Request, res: Response) => {
    try {
        const { videoType, style, mood, placement } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Photo is required' });
        }

        // Convert uploaded image to data URL for reference
        const photoDataURL = bufferToDataURL(file.buffer, file.mimetype);

        // Create a description based on the video type
        const photoDescription = `Photo uploaded for ${videoType || 'YouTube'} thumbnail`;

        // Generate 3 prompt variations
        const promptVariations = generatePromptVariations(
            photoDescription,
            videoType || 'YouTube video',
            style || 'professional',
            mood || 'engaging',
            placement || 'center'
        );

        // Generate thumbnails using OpenAI-enhanced prompts
        const thumbnailPromises = promptVariations.map(async (basePrompt) => {
            // Enhance prompt with OpenAI
            const enhancedPrompt = await generateThumbnailPrompt(
                basePrompt,
                style,
                mood
            );

            // Generate image
            const imageUrl = await generateImage(enhancedPrompt);
            return imageUrl;
        });

        const thumbnails = await Promise.all(thumbnailPromises);

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
