import { Agent } from '../';
import { timeoutPromise } from '../Utils';

declare module '../' {
    export interface Agent {
        _keepAliveInterval: any;

        enableKeepAlive(opts?: KeepAliveOptions): void;
        disableKeepAlive(): void;
    }
}

export interface KeepAliveOptions {
    interval?: number;
    timeout?: number;
}

function checkConnection(client: Agent): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        if (client.sm.started) {
            client.once('stream:management:ack', () => resolve());
            client.sm.request();
        } else {
            try {
                await client.ping();
                resolve();
            } catch (err) {
                if (err.error && err.error.condition !== 'timeout') {
                    resolve();
                } else {
                    reject();
                }
            }
        }
    });
}

export default function(client: Agent) {
    client.enableKeepAlive = (opts: KeepAliveOptions = {}) => {
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
                        client.transport.disconnect();
                    }
                }
            }
        }

        client._keepAliveInterval = setInterval(keepalive, interval * 1000);
    };

    client.disableKeepAlive = () => {
        if (client._keepAliveInterval) {
            clearInterval(client._keepAliveInterval);
            delete client._keepAliveInterval;
        }
    };

    client.on('disconnected', () => {
        client.disableKeepAlive();
    });
}
