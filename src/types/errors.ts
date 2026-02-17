export class JanusError extends Error {
    constructor(message: string, public code?: number) {
        super(message);
        this.name = 'JanusError';
    }
}

export class MediaError extends Error {
    constructor(message: string, public constraint?: string) {
        super(message);
        this.name = 'MediaError';
    }
} 