import { Agent } from '../Definitions';
import * as JID from '../protocol/jid';
import { IQ, RosterItem } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getRoster(): Promise<IQ>;
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
