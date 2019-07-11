import { Agent } from '../';
import * as JID from '../JID';
import { IQ, Roster, RosterItem, RosterResult } from '../protocol';

declare module '../' {
    export interface Agent {
        getRoster(): Promise<RosterResult>;
        updateRosterItem(item: RosterItem): Promise<void>;
        removeRosterItem(jid: string): Promise<void>;
        subscribe(jid: string): void;
        unsubscribe(jid: string): void;
        acceptSubscription(jid: string): void;
        denySubscription(jid: string): void;
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
    }
}

export default function(client: Agent) {
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
        }
        resp.roster.items = resp.roster.items || [];
        return resp.roster as RosterResult;
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
}
