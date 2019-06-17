import { Agent } from '../';
import {
    NS_DATAFORM,
    NS_DATAFORM_LAYOUT,
    NS_DATAFORM_MEDIA,
    NS_DATAFORM_VALIDATION
} from '../Namespaces';

import { DataForm, ReceivedMessage } from '../protocol';

type FormsMessage = ReceivedMessage & {
    forms: DataForm[];
};

declare module '../' {
    export interface AgentEvents {
        dataform: FormsMessage;
    }
}

function isFormsMessage(msg: ReceivedMessage): msg is FormsMessage {
    return !!msg.forms && msg.forms.length > 0;
}

export default function(client: Agent) {
    client.disco.addFeature(NS_DATAFORM);
    client.disco.addFeature(NS_DATAFORM_MEDIA);
    client.disco.addFeature(NS_DATAFORM_VALIDATION);
    client.disco.addFeature(NS_DATAFORM_LAYOUT);

    client.on('message', msg => {
        if (isFormsMessage(msg)) {
            client.emit('dataform', msg);
        }
    });
}
