import { Agent } from '../';
import { AccountManagement, IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        getAccountInfo(jid?: string): Promise<IQ>;
        updateAccount(jid: string, data: AccountManagement): Promise<IQ>;
        deleteAccount(jid: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.getAccountInfo = (jid?: string) => {
        return client.sendIQ({
            account: {},
            to: jid,
            type: 'get'
        });
    };

    client.updateAccount = (jid: string | undefined, data: AccountManagement) => {
        return client.sendIQ({
            account: data,
            to: jid,
            type: 'set'
        });
    };

    client.deleteAccount = (jid?: string) => {
        return client.sendIQ({
            account: {
                remove: true
            },
            to: jid,
            type: 'set'
        });
    };
}
