import { Agent } from '../';
import { ExternalServiceCredentials, ExternalServiceList, IQ } from '../protocol';

declare module '../' {
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
