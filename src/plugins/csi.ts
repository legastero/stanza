import { Agent } from '../';
import { CSI } from '../protocol';

declare module '../' {
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

    function sendCSI(type: 'active' | 'inactive') {
        if (client.features.negotiated.clientStateIndication) {
            client.send('csi', {
                type
            });
        }
    }

    client.markActive = () => sendCSI('active');
    client.markInactive = () => sendCSI('inactive');
}
