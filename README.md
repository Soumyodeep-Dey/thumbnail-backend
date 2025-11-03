# YouTube Thumbnail Generator - Backend

Backend API for generating YouTube thumbnails using OpenAI and NanoBanana image generation.

## Project Structure

```
backend/
├── src/
│   ├── server.ts           # Main Express server
│   ├── routes/
│   │   └── generate.ts     # Thumbnail generation endpoint
│   ├── utils/
│   │   ├── openaiPrompt.ts # OpenAI prompt generation
│   │   └── nanoBanana.ts   # NanoBanana image generation
│   └── types/
│       └── index.d.ts      # TypeScript type definitions
├── .env                    # Environment variables
├── package.json
└── tsconfig.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
NANOBANANA_API_KEY=your_nanobanana_api_key_here
```

## Development

Run the development server with hot reload:
```bash
npm run dev
```

## Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

## Production

Run the compiled server:
```bash
npm start
```

## API Endpoints

### POST /api/generate/thumbnail

Generate a YouTube thumbnail from a topic.

**Request Body:**
```json
{
  "topic": "How to cook pasta",
  "style": "modern",
  "mood": "energetic"
}
```

**Response:**
```json
{
  "success": true,
  "prompt": "Generated prompt for image generation...",
  "imageUrl": "https://..."
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Technologies

- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **OpenAI** - Prompt optimization
- **NanoBanana** - Image generation API
- **Axios** - HTTP client
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
