import { Agent } from '../Definitions';
import { IQ } from '../protocol/stanzas';
import { ExternalServiceCredentials, ExternalServiceList } from '../protocol/stanzas/xep0215';

declare module '../Definitions' {
    export interface Agent {
        getServices(
            jid: string,
            type?: string
        ): Promise<IQ & { externalServices: ExternalServiceList }>;
        getServiceCredentials(
            jid: string,
            host: string,
            type?: string,
            port?: number
        ): Promise<IQ & { externalServiceCredentials: ExternalServiceCredentials }>;
    }
}

export default function(client: Agent) {
    client.getServices = (jid: string, type?: string) => {
        return client.sendIQ({
            externalServices: {
                type
            },
            to: jid,
            type: 'get'
        });
    };

    client.getServiceCredentials = (jid: string, host: string, type?: string, port?: number) => {
        return client.sendIQ({
            externalServiceCredentials: {
                host,
                port,
                type
            },
            to: jid,
            type: 'get'
        });
    };
}
