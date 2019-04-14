import * as hashes from '../lib/crypto';

import { Agent } from '../Definitions';
import {
    NS_DELAY,
    NS_EME_0,
    NS_FORWARD_0,
    NS_HASH_NAME,
    NS_HASHES_1,
    NS_HASHES_2,
    NS_IDLE_1,
    NS_JSON_0,
    NS_OOB,
    NS_PSA,
    NS_REFERENCE_0,
    NS_SHIM
} from '../protocol';

export default function(client: Agent) {
    client.disco.addFeature('jid\\20escaping');

    client.disco.addFeature(NS_DELAY);
    client.disco.addFeature(NS_EME_0);
    client.disco.addFeature(NS_FORWARD_0);
    client.disco.addFeature(NS_HASHES_2);
    client.disco.addFeature(NS_HASHES_1);
    client.disco.addFeature(NS_IDLE_1);
    client.disco.addFeature(NS_JSON_0);
    client.disco.addFeature(NS_OOB);
    client.disco.addFeature(NS_PSA);
    client.disco.addFeature(NS_REFERENCE_0);
    client.disco.addFeature(NS_SHIM);

    const names = hashes.getHashes();
    for (const name of names) {
        client.disco.addFeature(NS_HASH_NAME(name));
    }
}
