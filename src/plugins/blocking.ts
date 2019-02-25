import { Agent } from '../Definitions';
import { IQ } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        block(jid: string): Promise<IQ>;
        unblock(jid: string): Promise<IQ>;
        getBlocked(): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.block = (jid: string) => {
        return client.sendIQ({
            blockList: {
                action: 'block',
                jids: [jid]
            },
            type: 'set'
        });
    };

    client.unblock = (jid: string) => {
        return client.sendIQ({
            blockList: {
                action: 'unblock',
                jids: [jid]
            },
            type: 'set'
        });
    };

    client.getBlocked = () => {
        return client.sendIQ({
            blockList: {
                action: 'list'
            },
            type: 'get'
        });
    };

    client.on('iq:set:blockList', (iq: IQ) => {
        const blockList = iq.blockList!;
        client.emit(blockList.action, {
            jids: blockList.jids || []
        });
        client.sendIQResult(iq);
    });
}
