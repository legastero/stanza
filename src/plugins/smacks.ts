import { Agent } from '../Definitions';
import { StreamFeatures, StreamManagement } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface AgentConfig {
        useStreamManagement?: boolean;
    }
}

export default function(client: Agent) {
    const smHandler = (sm: StreamManagement, done: (cmd?: string) => void) => {
        switch (sm.type) {
            case 'enabled':
                client.sm.enabled(sm);
                client.features.negotiated.streamManagement = true;
                client.off('sm', smHandler);
                return done();
            case 'resumed':
                client.sm.resumed(sm);
                client.features.negotiated.streamManagement = true;
                client.features.negotiated.bind = true;
                client.sessionStarted = true;
                client.off('sm', smHandler);
                return done('break'); // Halt further processing of stream features
            case 'failed':
                client.sm.failed(sm);
                client.emit('session:end');
                client.releaseGroup('session');
                client.off('sm', smHandler);
                done();
        }
    };

    const smacks = async (features: StreamFeatures, done: (cmd?: string) => void) => {
        if (!client.config.useStreamManagement) {
            return done();
        }

        client.on('sm', sm => smHandler(sm, done));

        if (!client.sm.id) {
            if (client.features.negotiated.bind) {
                client.sm.enable();
            } else {
                client.off('sm', smHandler);
                done();
            }
        } else if (client.sm.id && client.sm.allowResume) {
            client.sm.resume();
        } else {
            client.off('sm', smHandler);
            done();
        }
    };

    client.on('disconnected', () => {
        client.features.negotiated.streamManagement = false;
    });

    client.registerFeature('streamManagement', 200, smacks);
    client.registerFeature('streamManagement', 500, smacks);
}
