import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature(Namespaces.DATAFORM);
    client.disco.addFeature(Namespaces.DATAFORM_MEDIA);
    client.disco.addFeature(Namespaces.DATAFORM_VALIDATION);
    client.disco.addFeature(Namespaces.DATAFORM_LAYOUT);

    client.on('message', function(msg) {
        if (msg.form) {
            client.emit('dataform', msg);
        }
    });
}
