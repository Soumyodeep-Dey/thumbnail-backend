export interface ThumbnailRequest {
    topic: string;
    style?: string;
    mood?: string;
}

export interface ThumbnailResponse {
    success: boolean;
    prompt: string;
    imageUrl: string;
}

export interface MultipleThumbnailsRequest {
    videoType: string;
    style?: string;
    mood?: string;
    placement?: string;
    photo: File;
}

export interface MultipleThumbnailsResponse {
    thumbnails: string[];
}

export interface ErrorResponse {
    error: string;
    message?: string;
}

// Extend Express Request to include file
declare global {
    namespace Express {
        interface Request {
            file?: Multer.File;
        }
    }
}