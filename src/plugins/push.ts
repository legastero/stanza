import { Agent } from '../Definitions';
import { DataFormField, IQ } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        enableNotifications(jid: string, node: string, fieldList?: DataFormField[]): Promise<IQ>;
        disableNotifications(jid: string, node?: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.enableNotifications = (jid: string, node: string, fieldList: DataFormField[] = []) => {
        return client.sendIQ({
            push: {
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
                node,
                type: 'enable'
            },
            type: 'set'
        });
    };

    client.disableNotifications = (jid: string, node?: string) => {
        return client.sendIQ({
            push: {
                jid,
                node,
                type: 'disable'
            },
            type: 'set'
        });
    };
}
