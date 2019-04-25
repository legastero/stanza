import { Agent } from '../Definitions';
import { CSI } from '../protocol';

declare module '../Definitions' {
    export interface Agent {
        markActive(): void;
        markInactive(): void;

        send(path: 'csi', data: CSI): void;
    }
}

export default function(client: Agent) {
    client.registerFeature('clientStateIndication', 400, (features, cb) => {
        client.features.negotiated.clientStateIndication = true;
        cb();
    });

    client.markActive = function() {
        if (this.features.negotiated.clientStateIndication) {
            client.send('csi', {
                type: 'active'
            });
        }
    };

    client.markInactive = function() {
        if (this.features.negotiated.clientStateIndication) {
            client.send('csi', {
                type: 'inactive'
            });
        }
    };
}
