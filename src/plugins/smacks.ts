import { Agent } from '../';
import {
    StreamFeatures,
    StreamManagement,
    StreamManagementAck,
    StreamManagementResume
} from '../protocol';

declare module '../' {
    export interface AgentConfig {
        /**
         * Use Stream Management
         *
         * Controls if <a href="https://xmpp.org/extensions/xep-0198.html">XEP-0198: Stream Management</a>
         * is enabled for the session.
         *
         * Disabling stream management is <i>not</i> recommended.
         *
         * @default true
         */
        useStreamManagement?: boolean;
    }

    export interface AgentEvents {
        sm: StreamManagement;
        'stream:management:ack': StreamManagementAck;
        'stream:management:resumed': StreamManagementResume;
    }
}

export default function(client: Agent) {
    const smacks = async (features: StreamFeatures, done: (cmd?: string) => void) => {
        if (!client.config.useStreamManagement) {
            return done();
        }

        const smHandler = (sm: StreamManagement) => {
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
                    client.emit('stream:management:resumed', sm);
                    client.off('sm', smHandler);
                    return done('break'); // Halt further processing of stream features
                case 'failed':
                    client.sm.failed(sm);
                    client.emit('session:end');
                    client.off('sm', smHandler);
                    done();
            }
        };

        client.on('sm', smHandler);

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
