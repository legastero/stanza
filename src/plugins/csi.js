import { Namespaces } from '../protocol';

export default function(client, stanzas) {
    const Active = stanzas.getDefinition('active', Namespaces.CSI);
    const Inactive = stanzas.getDefinition('inactive', Namespaces.CSI);

    client.registerFeature('clientStateIndication', 400, function(features, cb) {
        this.features.negotiated.clientStateIndication = true;
        cb();
    });

    client.markActive = function() {
        if (this.features.negotiated.clientStateIndication) {
            this.send(new Active());
        }
    };

    client.markInactive = function() {
        if (this.features.negotiated.clientStateIndication) {
            this.send(new Inactive());
        }
    };
}
