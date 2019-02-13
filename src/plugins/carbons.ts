import { Agent } from '../Definitions';
import * as JID from '../protocol/jid';
import { IQ, Message } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        enableCarbons(): Promise<IQ>;
        disableCarbons(): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.enableCarbons = (): Promise<IQ> => {
        return client.sendIQ({
            carbons: {
                type: 'enable'
            },
            type: 'set'
        });
    };

    client.disableCarbons = (): Promise<IQ> => {
        return client.sendIQ({
            carbons: {
                type: 'disable'
            },
            type: 'set'
        });
    };

    client.on('message', (msg: Message) => {
        if (!msg.carbon) {
            return;
        }

        if (!JID.equalBare(msg.from, client.jid)) {
            return;
        }

        client.emit(`carbon:${msg.carbon.type}`, msg);

        if (msg.carbon.type !== 'received' && msg.carbon.type !== 'sent') {
            return;
        }

        const forwardedMessage = msg.carbon.forward.message!;
        if (!forwardedMessage.delay) {
            forwardedMessage.delay = msg.carbon.forward.delay || {
                timestamp: new Date(Date.now())
            };
        }

        if (msg.carbon.type === 'sent') {
            client.emit('message:sent', forwardedMessage);
        }
        if (msg.carbon.type === 'received') {
            client.emit('message', forwardedMessage);
        }
    });
}
