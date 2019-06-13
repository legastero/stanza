import { Agent } from '../';
import { NS_VCARD_TEMP, VCardTemp } from '../protocol';

declare module '../' {
    export interface Agent {
        getVCard(jid: string): Promise<VCardTemp>;
        publishVCard(vcard: VCardTemp): Promise<void>;
    }
}

export default function(client: Agent) {
    client.getVCard = async (jid: string) => {
        const resp = await client.sendIQ({
            to: jid,
            type: 'get',
            vcard: {
                format: NS_VCARD_TEMP
            }
        });

        return resp.vcard;
    };

    client.publishVCard = async (vcard: VCardTemp) => {
        await client.sendIQ({
            type: 'set',
            vcard
        });
    };
}
