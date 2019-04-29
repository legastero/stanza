import { Agent } from '../';
import { DataFormField, IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        enableNotifications(jid: string, node: string, fieldList?: DataFormField[]): Promise<IQ>;
        disableNotifications(jid: string, node?: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
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
