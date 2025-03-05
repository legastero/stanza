import { EventEmitter } from 'events';
import { JanusService } from '../services/JanusService';

export interface Agent extends EventEmitter {
    jid: string;
    config: AgentConfig;
    janus?: JanusService;
    // ... rest of existing Agent interface properties

    // Add Janus-specific methods
    createJanusSession(url: string): JanusService;
    destroyJanusSession(): Promise<void>;
} 