// Convert buffer to base64 data URL
export function bufferToDataURL(buffer: Buffer, mimetype: string): string {
    const base64 = buffer.toString('base64');
    return `data:${mimetype};base64,${base64}`;
}

// Generate multiple prompt variations
export function generatePromptVariations(
    photoDescription: string,
    videoType: string,
    style: string,
    mood: string,
    placement: string
): string[] {
    const basePrompt = `YouTube thumbnail for ${videoType} video, ${style} style, ${mood} mood, subject positioned ${placement}`;

    const variations = [
        `${basePrompt}, vibrant colors, high contrast, professional lighting, 4K quality`,
        `${basePrompt}, dramatic lighting, bold typography space, eye-catching composition`,
        `${basePrompt}, cinematic feel, dynamic angles, premium quality, engaging visual`,
    ];

    return variations;
}
