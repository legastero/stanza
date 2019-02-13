import { Agent } from '../Definitions';
import { StreamFeatures, StreamManagement } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface AgentConfig {
        useStreamManagement?: boolean;
    }
}

export default function(client: Agent) {
    const smacks = async (features: StreamFeatures, done: (cmd?: string) => void) => {
        if (!client.config.useStreamManagement) {
            return done();
        }

        client.on('stream:management:enabled', 'sm', (enabled: StreamManagement) => {
            client.sm.enabled(enabled);
            client.features.negotiated.streamManagement = true;
            client.releaseGroup('sm');
            done();
        });

        client.on('stream:management:resumed', 'sm', (resumed: StreamManagement) => {
            client.sm.resumed(resumed);
            client.features.negotiated.streamManagement = true;
            client.features.negotiated.bind = true;
            client.sessionStarted = true;
            client.releaseGroup('sm');
            done('break'); // Halt further processing of stream features
        });

        client.on('stream:management:failed', 'sm', (failed: StreamManagement) => {
            client.sm.failed(failed);
            client.emit('session:end');
            client.releaseGroup('session');
            client.releaseGroup('sm');
            done();
        });

        if (!client.sm.id) {
            if (client.features.negotiated.bind) {
                client.sm.enable();
            } else {
                client.releaseGroup('sm');
                done();
            }
        } else if (client.sm.id && client.sm.allowResume) {
            client.sm.resume();
        } else {
            client.releaseGroup('sm');
            done();
        }
    };

    client.on('disconnected', () => {
        client.features.negotiated.streamManagement = false;
    });

    client.registerFeature('streamManagement', 200, smacks);
    client.registerFeature('streamManagement', 500, smacks);
}
