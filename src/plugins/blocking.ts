import { Agent } from '../';
import { Blocking, BlockingList, ReceivedIQSet } from '../protocol';

declare module '../' {
    export interface Agent {
        block(jid: string): Promise<void>;
        unblock(jid: string): Promise<void>;
        getBlocked(): Promise<BlockingList>;
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
    async function toggleBlock(action: 'block' | 'unblock', jid: string) {
        await client.sendIQ({
            blockList: {
                action,
                jids: [jid]
            },
            type: 'set'
        });
    }

    client.block = async (jid: string) => toggleBlock('block', jid);
    client.unblock = async (jid: string) => toggleBlock('unblock', jid);

    client.getBlocked = async () => {
        const result = await client.sendIQ({
            blockList: {
                action: 'list'
            },
            type: 'get'
        });

        return {
            jids: [],
            ...result.blockList
        };
    };

    client.on('iq:set:blockList', iq => {
        const blockList = iq.blockList;
        client.emit(blockList.action, {
            jids: blockList.jids || []
        });
        client.sendIQResult(iq);
    });
}
