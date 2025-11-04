import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import generateRouter from './routes/generate.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api', generateRouter);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Log all incoming requests for debugging
app.use((req: Request, res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 404 handler
app.use((req: Request, res: Response) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Available routes:`);
    console.log(`  - GET  http://localhost:${PORT}/health`);
    console.log(`  - POST http://localhost:${PORT}/api/generate-thumbnails`);
    console.log(`  - POST http://localhost:${PORT}/api/thumbnail`);
});
