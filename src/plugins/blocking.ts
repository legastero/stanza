import { Agent } from '../';
import { Blocking, ReceivedIQSet } from '../protocol';

declare module '../' {
    export interface Agent {
        block(jid: string): Promise<void>;
        unblock(jid: string): Promise<void>;
        getBlocked(): Promise<string[]>;
    }

    export interface AgentEvents {
        block: {
            jids: string[];
        };
        unblock: {
            jids: string[];
        };
        'iq:set:blockList': ReceivedIQSet & {
            blockList: Blocking & { action: 'block' | 'unblock' };
        };
    }
}

export default function(client: Agent) {
    client.block = async (jid: string) => {
        await client.sendIQ({
            blockList: {
                action: 'block',
                jids: [jid]
            },
            type: 'set'
        });
    };

    client.unblock = async (jid: string) => {
        await client.sendIQ({
            blockList: {
                action: 'unblock',
                jids: [jid]
            },
            type: 'set'
        });
    };

    client.getBlocked = async () => {
        const result = await client.sendIQ({
            blockList: {
                action: 'list'
            },
            type: 'get'
        });

        return result.blockList.jids || [];
    };

    client.on('iq:set:blockList', iq => {
        const blockList = iq.blockList;
        client.emit(blockList.action, {
            jids: blockList.jids || []
        });
        client.sendIQResult(iq);
    });
}
