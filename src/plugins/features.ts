import { series as asyncSeries } from '../lib/async';

import { Agent } from '../Definitions';
import { StreamFeatures } from '../protocol/stanzas';

declare module '../Definitions' {
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

export default function(client: Agent) {
    client.features = {
        handlers: {},
        negotiated: {},
        order: []
    };

    client.registerFeature = function(name, priority, handler) {
        this.features.order.push({
            name,
            priority
        });
        // We want the features with smallest priority values at the start of the list
        this.features.order.sort((a, b) => a.priority - b.priority);
        this.features.handlers[name] = handler.bind(client);
    };

    client.on('features', (features: StreamFeatures) => {
        const series = [];
        const negotiated = client.features.negotiated;
        const handlers = client.features.handlers;

        for (const feature of client.features.order) {
            const name = feature.name;
            if ((features as any)[name] && handlers[name] && !negotiated[name]) {
                series.push((cb: () => void) => {
                    if (!negotiated[name]) {
                        handlers[name](features, cb);
                    } else {
                        cb();
                    }
                });
            }
        }

        asyncSeries<string, string>(series, (cmd, msg) => {
            if (cmd === 'restart') {
                if (client.transport) {
                    client.transport.restart();
                }
            } else if (cmd === 'disconnect') {
                client.emit('stream:error', {
                    condition: 'policy-violation',
                    text: 'Failed to negotiate stream features: ' + msg
                });
                client.disconnect();
            }
        });
    });
}
