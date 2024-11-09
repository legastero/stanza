export interface JanusServiceEvents {
    'participant-joined': (participantId: string, displayName: string) => void;
    'participant-left': (participantId: string) => void;
    'stream-started': (stream: MediaStream) => void;
    'stream-stopped': (stream: MediaStream) => void;
    'error': (error: Error) => void;
} 