import { Agent } from '../';
import * as JID from '../JID';
import { IQ, Roster, RosterItem, RosterResult } from '../protocol';

declare module '../' {
    export interface Agent {
        getRoster(): Promise<IQ & { roster: RosterResult }>;
        updateRosterItem(item: RosterItem): Promise<IQ>;
        removeRosterItem(jid: string): Promise<IQ>;
        subscribe(jid: string): void;
        unsubscribe(jid: string): void;
        acceptSubscription(jid: string): void;
        denySubscription(jid: string): void;
    }

    export interface AgentConfig {
        rosterVer?: string;
    }
}

export default function(client: Agent) {
    client.on('iq:set:roster', (iq: IQ) => {
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
        const resp = await client.sendIQ<{ roster: Roster }, { roster: RosterResult }>({
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
        return resp;
    };

    client.updateRosterItem = (item: RosterItem) => {
        return client.sendIQ({
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
