import { Agent } from '../';
import * as JID from '../JID';
import { CarbonMessage, IQ, Message, ReceivedMessage } from '../protocol';

declare module '../' {
    export interface Agent {
        enableCarbons(): Promise<void>;
        disableCarbons(): Promise<void>;
    }

    export interface AgentEvents {
        'carbon:received': ReceivedCarbon;
        'carbon:sent': SentCarbon;
    }
}

export type ReceivedCarbon = ReceivedMessage & {
    carbon: CarbonMessage & { type: 'received' };
};

export type SentCarbon = ReceivedMessage & {
    carbon: CarbonMessage & { type: 'sent' };
};

function isReceivedCarbon(msg: Message): msg is ReceivedCarbon {
    return !!msg.carbon && msg.carbon.type === 'received';
}
function isSentCarbon(msg: Message): msg is SentCarbon {
    return !!msg.carbon && msg.carbon.type === 'sent';
}

export default function(client: Agent) {
    client.enableCarbons = async () => {
        await client.sendIQ({
            carbons: {
                action: 'enable'
            },
            type: 'set'
        });
    };

    client.disableCarbons = async () => {
        await client.sendIQ({
            carbons: {
                action: 'disable'
            },
            type: 'set'
        });
    };

    client.on('message', msg => {
        if (!msg.carbon || !JID.equalBare(msg.from, client.jid)) {
            return;
        }

        if (msg.carbon.type !== 'received' && msg.carbon.type !== 'sent') {
            return;
        }

        const forwardedMessage = msg.carbon.forward.message!;
        if (!forwardedMessage.delay) {
            forwardedMessage.delay = msg.carbon.forward.delay || {
                timestamp: new Date(Date.now())
            };
        }

        if (isReceivedCarbon(msg)) {
            client.emit('carbon:received', msg);
            client.emit('message', forwardedMessage as ReceivedMessage);
        }
        if (isSentCarbon(msg)) {
            client.emit('carbon:sent', msg);
            client.emit('message:sent', forwardedMessage);
        }
    });
}
