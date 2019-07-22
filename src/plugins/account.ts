import { Agent } from '../';
import { NS_VCARD_TEMP } from '../Namespaces';
import { AccountManagement, DataFormField, IQ, PrivateStorage, VCardTemp } from '../protocol';

declare module '../' {
    export interface Agent {
        getAccountInfo(jid?: string): Promise<AccountManagement>;
        updateAccount(jid: string, data: AccountManagement): Promise<IQ>;
        deleteAccount(jid: string): Promise<IQ>;
        getPrivateData<T extends keyof PrivateStorage>(key: T): Promise<PrivateStorage[T]>;
        setPrivateData<T extends keyof PrivateStorage>(
            key: T,
            data: PrivateStorage[T]
        ): Promise<IQ>;
        getVCard(jid: string): Promise<VCardTemp>;
        publishVCard(vcard: VCardTemp): Promise<void>;
        enableNotifications(jid: string, node: string, fieldList?: DataFormField[]): Promise<IQ>;
        disableNotifications(jid: string, node?: string): Promise<IQ>;
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

    client.getPrivateData = async (key: keyof PrivateStorage) => {
        const res = await client.sendIQ({
            privateStorage: {
                [key]: {}
            },
            type: 'get'
        });

        return res.privateStorage[key];
    };

    client.setPrivateData = async <T extends keyof PrivateStorage>(
        key: T,
        value: PrivateStorage[T]
    ) => {
        return client.sendIQ({
            privateStorage: {
                [key]: value
            },
            type: 'set'
        });
    };

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

    client.enableNotifications = (jid: string, node: string, fieldList: DataFormField[] = []) => {
        return client.sendIQ({
            push: {
                action: 'enable',
                form: {
                    fields: [
                        {
                            name: 'FORM_TYPE',
                            type: 'hidden',
                            value: 'http://jabber.org/protocol/pubsub#publish-options'
                        },
                        ...fieldList
                    ],
                    type: 'submit'
                },
                jid,
                node
            },
            type: 'set'
        });
    };

    client.disableNotifications = (jid: string, node?: string) => {
        return client.sendIQ({
            push: {
                action: 'disable',
                jid,
                node
            },
            type: 'set'
        });
    };
}
