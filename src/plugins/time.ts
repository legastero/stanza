import { Agent } from '../';
import { NS_TIME } from '../protocol';
import { IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        getTime(jid: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.disco.addFeature(NS_TIME);

    client.getTime = (jid: string) => {
        return client.sendIQ({
            time: {},
            to: jid,
            type: 'get'
        });
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
