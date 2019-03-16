import { Agent } from '../Definitions';
import { NS_VERSION } from '../protocol';
import { IQ, SoftwareVersion } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getSoftwareVersion(jid: string): Promise<IQ>;
    }

    export interface AgentConfig {
        softwareVersion?: SoftwareVersion;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_VERSION);

    client.on('iq:get:softwareVersion', (iq: IQ) => {
        return client.sendIQResult(iq, {
            softwareVersion: client.config.softwareVersion || {
                name: 'stanzajs.org'
            }
        });
    });

    client.getSoftwareVersion = (jid: string) => {
        return client.sendIQ({
            softwareVersion: {},
            to: jid,
            type: 'get'
        });
    };
}
