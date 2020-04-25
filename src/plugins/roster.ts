import { Agent } from '../';
import * as JID from '../JID';
import {
    Blocking,
    BlockingList,
    IQ,
    ReceivedIQSet,
    Roster,
    RosterItem,
    RosterResult
} from '../protocol';

declare module '../' {
    export interface Agent {
        getRoster(): Promise<RosterResult>;
        updateRosterItem(item: RosterItem): Promise<void>;
        removeRosterItem(jid: string): Promise<void>;
        subscribe(jid: string): void;
        unsubscribe(jid: string): void;
        acceptSubscription(jid: string): void;
        denySubscription(jid: string): void;
        block(jid: string): Promise<void>;
        unblock(jid: string): Promise<void>;
        getBlocked(): Promise<BlockingList>;
        goInvisible(probe?: boolean): Promise<void>;
        goVisible(): Promise<void>;
    }

    export interface AgentConfig {
        /**
         * Roster Version
         *
         * The latest known version of the user's roster.
         *
         * If the version matches the version on the server, roster data does not need to be sent to the client.
         *
         * @default undefined
         */
        rosterVer?: string;
    }

    export interface AgentEvents {
        'iq:set:roster': IQ & {
            roster: Roster;
        };
        'roster:update': IQ & {
            roster: Roster;
        };
        'roster:ver': string;
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

export default function (client: Agent) {
    client.on('iq:set:roster', iq => {
        const allowed = JID.allowedResponders(client.jid);
        if (!allowed.has(iq.from)) {
            return client.sendIQError(iq, {
                error: {
                    condition: 'service-unavailable',
                    type: 'cancel'
                }
            });
        }

        client.emit('roster:update', iq);
        client.sendIQResult(iq);
    });

    client.on('iq:set:blockList', iq => {
        const allowed = JID.allowedResponders(client.jid);
        if (!allowed.has(iq.from)) {
            return client.sendIQError(iq, {
                error: {
                    condition: 'service-unavailable',
                    type: 'cancel'
                }
            });
        }

        const blockList = iq.blockList;
        client.emit(blockList.action, {
            jids: blockList.jids || []
        });
        client.sendIQResult(iq);
    });

    client.getRoster = async () => {
        const resp = await client.sendIQ({
            roster: {
                version: client.config.rosterVer
            },
            type: 'get'
        });
        if (resp.roster) {
            const version = resp.roster.version;
            if (version) {
                client.config.rosterVer = version;
                client.emit('roster:ver', version);
            }
            resp.roster.items = resp.roster.items || [];
            return resp.roster as RosterResult;
        } else {
            return { items: [] };
        }
    };

    client.updateRosterItem = async (item: RosterItem) => {
        await client.sendIQ({
            roster: {
                items: [item]
            },
            type: 'set'
        });
    };

    client.removeRosterItem = (jid: string) => {
        return client.updateRosterItem({ jid, subscription: 'remove' });
    };

    client.subscribe = (jid: string) => {
        client.sendPresence({ type: 'subscribe', to: jid });
    };

    client.unsubscribe = (jid: string) => {
        client.sendPresence({ type: 'unsubscribe', to: jid });
    };

    client.acceptSubscription = (jid: string) => {
        client.sendPresence({ type: 'subscribed', to: jid });
    };

    client.denySubscription = (jid: string) => {
        client.sendPresence({ type: 'unsubscribed', to: jid });
    };

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

    client.goInvisible = async (probe: boolean = false) => {
        await client.sendIQ({
            type: 'set',
            visiblity: {
                probe,
                type: 'invisible'
            }
        });
    };

    client.goVisible = async () => {
        await client.sendIQ({
            type: 'set',
            visiblity: {
                type: 'visible'
            }
        });
    };
}
