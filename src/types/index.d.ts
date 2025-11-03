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

export interface ErrorResponse {
    error: string;
    message?: string;
}
