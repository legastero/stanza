import { Agent } from '../';
import { NS_VERSION } from '../Namespaces';
import { ReceivedIQGet, SoftwareVersion } from '../protocol';

declare module '../' {
    export interface Agent {
        getSoftwareVersion(jid: string): Promise<SoftwareVersion>;
    }

    export interface AgentConfig {
        /**
         * Software Version Info
         *
         * @default { name: "stanzajs.org" }
         */
        softwareVersion?: SoftwareVersion;
    }

    export interface AgentEvents {
        'iq:get:softwareVersion': ReceivedIQGet & {
            softwareVersion: SoftwareVersion;
        };
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_VERSION);

    client.on('iq:get:softwareVersion', iq => {
        return client.sendIQResult(iq, {
            softwareVersion: client.config.softwareVersion || {
                name: 'stanzajs.org'
            }
        });
    });

    client.getSoftwareVersion = async (jid: string) => {
        const resp = await client.sendIQ({
            softwareVersion: {},
            to: jid,
            type: 'get'
        });

        return resp.softwareVersion;
    };
}
