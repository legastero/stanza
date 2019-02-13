import { Agent } from '../Definitions';
import {
    NS_DATAFORM,
    NS_DATAFORM_LAYOUT,
    NS_DATAFORM_MEDIA,
    NS_DATAFORM_VALIDATION
} from '../protocol';
import { Message } from '../protocol/stanzas';

export default function(client: Agent) {
    client.disco.addFeature(NS_DATAFORM);
    client.disco.addFeature(NS_DATAFORM_MEDIA);
    client.disco.addFeature(NS_DATAFORM_VALIDATION);
    client.disco.addFeature(NS_DATAFORM_LAYOUT);

    client.on('message', (msg: Message) => {
        if (msg.forms && msg.forms.length) {
            client.emit('dataform', msg);
        }
    });
}
