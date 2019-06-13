import { Agent } from '../';
import { ExternalServiceCredentials, ExternalServiceList, IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        getServices(jid: string, type?: string): Promise<ExternalServiceList>;
        getServiceCredentials(
            jid: string,
            host: string,
            type?: string,
            port?: number
        ): Promise<ExternalServiceCredentials>;
    }
}

export default function(client: Agent) {
    client.getServices = async (jid: string, type?: string) => {
        const resp = await client.sendIQ({
            externalServices: {
                type
            } as ExternalServiceList,
            to: jid,
            type: 'get'
        });

        const services = resp.externalServices;
        services.services = services.services || [];

        return services;
    };

    client.getServiceCredentials = async (
        jid: string,
        host: string,
        type?: string,
        port?: number
    ) => {
        const resp = await client.sendIQ({
            externalServiceCredentials: {
                host,
                port,
                type
            } as ExternalServiceCredentials,
            to: jid,
            type: 'get'
        });

        return resp.externalServiceCredentials;
    };
}
