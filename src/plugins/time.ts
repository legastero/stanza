import { Agent } from '../';
import { NS_TIME } from '../Namespaces';
import { EntityTime, IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        getTime(jid: string): Promise<EntityTime>;
    }

    export interface AgentEvents {
        'iq:get:time': IQ & {
            time: EntityTime;
        };
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_TIME);

    client.getTime = async (jid: string) => {
        const resp = await client.sendIQ({
            time: {},
            to: jid,
            type: 'get'
        });

        return resp.time;
    };

    client.on('iq:get:time', (iq: IQ) => {
        const time = new Date();
        client.sendIQResult(iq, {
            time: {
                tzo: time.getTimezoneOffset(),
                utc: time
            }
        });
    });
}
