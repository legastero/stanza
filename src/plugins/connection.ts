import { Agent } from '../';
import { NS_PING } from '../Namespaces';
import {
    IQ,
    StreamFeatures,
    StreamManagement,
    StreamManagementAck,
    StreamManagementResume
} from '../protocol';
import { timeoutPromise } from '../Utils';

export interface KeepAliveOptions {
    interval?: number;
    timeout?: number;
}

declare module '../' {
    export interface Agent {
        _keepAliveInterval?: any;
        _keepAliveOptions?: KeepAliveOptions;

        markActive(): void;
        markInactive(): void;

        enableKeepAlive(opts?: KeepAliveOptions): void;
        disableKeepAlive(): void;
        ping(jid?: string): Promise<void>;
        _stopKeepAliveInterval(): void;
    }

    export interface AgentEvents {
        sm: StreamManagement;
        'stream:management:ack': StreamManagementAck;
        'stream:management:resumed': StreamManagementResume;
        'iq:get:ping': IQ & { ping: boolean };
    }

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
}

async function checkConnection(client: Agent): Promise<void> {
    if (client.sm.started) {
        return new Promise(resolve => {
            client.once('stream:management:ack', () => resolve());
            client.sm.request();
        });
    }
    try {
        await client.ping();
    } catch (err: any) {
        if (err.error && err.error.condition !== 'timeout') {
            return;
        } else {
            throw err;
        }
    }
}

function sendCSI(client: Agent, type: 'active' | 'inactive') {
    if (client.features.negotiated.clientStateIndication) {
        client.send('csi', {
            type
        });
    }
}

export default function (client: Agent): void {
    client.disco.addFeature(NS_PING);

    client.on('iq:get:ping', iq => {
        client.sendIQResult(iq);
    });

    client.on('--reset-stream-features', () => {
        client._stopKeepAliveInterval();
        client.features.negotiated.streamManagement = false;
        client.features.negotiated.clientStateIndication = false;
    });

    client.markActive = () => sendCSI(client, 'active');
    client.markInactive = () => sendCSI(client, 'inactive');

    client.ping = async (jid?: string) => {
        await client.sendIQ({
            ping: true,
            to: jid,
            type: 'get'
        });
    };

    client.enableKeepAlive = (opts: KeepAliveOptions = {}) => {
        client._keepAliveOptions = opts;

        // Ping every 5 minutes
        const interval = opts.interval || 300;

        // Disconnect if no response in 15 seconds
        const timeout = opts.timeout || client.config.timeout || 15;

        async function keepalive() {
            if (client.sessionStarted) {
                try {
                    await timeoutPromise<void>(checkConnection(client), timeout * 1000);
                } catch (err) {
                    // Kill the apparently dead connection without closing
                    // the stream itself so we can reconnect and potentially
                    // resume the session.
                    client.emit('stream:error', {
                        condition: 'connection-timeout',
                        text: 'Server did not respond in ' + timeout + ' seconds'
                    });
                    if (client.transport) {
                        client.transport.hasStream = false;
                        client.transport.disconnect(false);
                    }
                }
            }
        }

        clearInterval(client._keepAliveInterval);
        client._keepAliveInterval = setInterval(keepalive, interval * 1000);
    };

    client._stopKeepAliveInterval = () => {
        if (client._keepAliveInterval) {
            clearInterval(client._keepAliveInterval);
            delete client._keepAliveInterval;
        }
    };

    client.disableKeepAlive = () => {
        delete client._keepAliveOptions;
        client._stopKeepAliveInterval();
    };

    client.on('stream:management:resumed', () => {
        client._keepAliveOptions && client.enableKeepAlive(client._keepAliveOptions);
    });
    client.on('stream:start', () => {
        client._keepAliveOptions && client.enableKeepAlive(client._keepAliveOptions);
    });

    const smacks = async (features: StreamFeatures, done: (cmd?: string) => void) => {
        if (!client.config.useStreamManagement) {
            return done();
        }

        const smHandler = async (sm: StreamManagement) => {
            switch (sm.type) {
                case 'enabled':
                    await client.sm.enabled(sm);
                    client.features.negotiated.streamManagement = true;
                    client.off('sm', smHandler);
                    return done();
                case 'resumed':
                    await client.sm.resumed(sm);
                    client.features.negotiated.streamManagement = true;
                    client.features.negotiated.bind = true;
                    client.sessionStarted = true;
                    client.sessionStarting = false;
                    client.off('sm', smHandler);
                    client.emit('stream:management:resumed', sm);
                    return done('break'); // Halt further processing of stream features
                case 'failed':
                    await client.sm.failed(sm);
                    client.off('sm', smHandler);
                    client.emit('session:end');
                    done();
            }
        };

        client.on('sm', smHandler);

        if (!client.sm.id) {
            if (client.features.negotiated.bind) {
                await client.sm.enable();
            } else {
                client.off('sm', smHandler);
                done();
            }
        } else if (client.sm.id && client.sm.allowResume) {
            await client.sm.resume();
        } else {
            client.off('sm', smHandler);
            done();
        }
    };

    client.registerFeature('streamManagement', 200, smacks);
    client.registerFeature('streamManagement', 500, smacks);
    client.registerFeature('clientStateIndication', 400, (features, cb) => {
        client.features.negotiated.clientStateIndication = true;
        cb();
    });
}
