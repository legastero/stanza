import * as hashes from 'iana-hashes';

import { Namespaces } from '../protocol';

export default function(client) {
    client.disco.addFeature('jid\\20escaping');

    client.disco.addFeature(Namespaces.DELAY);
    client.disco.addFeature(Namespaces.EME_0);
    client.disco.addFeature(Namespaces.FORWARD_0);
    client.disco.addFeature(Namespaces.HASHES_1);
    client.disco.addFeature(Namespaces.IDLE_1);
    client.disco.addFeature(Namespaces.JSON_0);
    client.disco.addFeature(Namespaces.OOB);
    client.disco.addFeature(Namespaces.PSA);
    client.disco.addFeature(Namespaces.REFERENCE_0);
    client.disco.addFeature(Namespaces.SHIM);

    client.disco.addFeature(`${Namespaces.SHIM}#SubID`, Namespaces.SHIM);

    const names = hashes.getHashes();
    for (const name of names) {
        client.disco.addFeature(Namespaces.HASH_NAME(name));
    }
}
