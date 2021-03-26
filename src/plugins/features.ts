import { Agent } from '../';
import { StreamFeatures } from '../protocol';

declare module '../' {
    export interface Agent {
        features: {
            handlers: {
                [key: string]: FeatureHandler;
            };
            negotiated: {
                [key: string]: boolean;
            };
            order: Array<{
                name: string;
                priority: number;
            }>;
        };

        registerFeature(name: string, priority: number, handler: FeatureHandler): void;
    }
}

type FeatureHandler = (data: StreamFeatures, done: (cmd?: string, msg?: string) => void) => void;

export default function (client: Agent) {
    client.features = {
        handlers: Object.create(null),
        negotiated: Object.create(null),
        order: []
    };

    client.registerFeature = function (name, priority, handler) {
        this.features.order.push({
            name,
            priority
        });
        // We want the features with smallest priority values at the start of the list
        this.features.order.sort((a, b) => a.priority - b.priority);
        this.features.handlers[name] = handler.bind(client);
    };

    client.on('features', async features => {
        const negotiated = client.features.negotiated;
        const handlers = client.features.handlers;
        const processingOrder: string[] = [];

        for (const { name } of client.features.order) {
            if ((features as any)[name] && handlers[name] && !negotiated[name]) {
                processingOrder.push(name);
            }
        }

        function processFeature(
            featureName: string
        ): Promise<null | { command: string; message?: string }> {
            return new Promise(resolve => {
                handlers[featureName](features, (command, message) => {
                    if (command) {
                        resolve({ command, message });
                    } else {
                        resolve(null);
                    }
                });
            });
        }

        for (const item of processingOrder) {
            if (negotiated[item]) {
                continue;
            }

            let cmd = '';
            let msg = '';
            try {
                const res = await processFeature(item);
                if (res) {
                    cmd = res.command;
                    msg = res.message || '';
                }
            } catch (err) {
                cmd = 'disconnect';
                msg = err.message;
                console.error(err);
            }
            if (!cmd) {
                continue;
            }

            if (cmd === 'restart' && client.transport) {
                client.transport.restart();
            }
            if (cmd === 'disconnect') {
                client.emit('stream:error', {
                    condition: 'policy-violation',
                    text: 'Failed to negotiate stream features: ' + msg
                });
                client.disconnect();
            }
            return;
        }
    });
}
