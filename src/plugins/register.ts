import { Agent } from '../';
import { AccountManagement, IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        getAccountInfo(jid?: string): Promise<AccountManagement>;
        updateAccount(jid: string, data: AccountManagement): Promise<IQ>;
        deleteAccount(jid: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.getAccountInfo = async (jid?: string) => {
        const resp = await client.sendIQ({
            account: {} as AccountManagement,
            to: jid,
            type: 'get'
        });
        return resp.account;
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
