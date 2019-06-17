import { Agent } from '../';
import { NS_CORRECTION_0 } from '../Namespaces';
import { ReceivedMessage } from '../protocol';

type CorrectionMessage = ReceivedMessage & {
    replace: ReceivedMessage['replace'];
};

declare module '../' {
    export interface AgentEvents {
        replace: CorrectionMessage;
    }
}

function isCorrection(msg: ReceivedMessage): msg is CorrectionMessage {
    return !!msg.replace;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_CORRECTION_0);

    client.on('message', msg => {
        if (isCorrection(msg)) {
            client.emit('replace', msg);
        }
    });
}
