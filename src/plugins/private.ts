import { Agent } from '../Definitions';
import { IQ, PrivateStorage } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getPrivateData(opts: PrivateStorage): Promise<IQ>;
        setPrivateData(opts: PrivateStorage): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.getPrivateData = (opts: PrivateStorage) => {
        return client.sendIQ({
            privateStorage: opts,
            type: 'get'
        });
    };

    client.setPrivateData = (opts: PrivateStorage) => {
        return client.sendIQ({
            privateStorage: opts,
            type: 'set'
        });
    };
}
