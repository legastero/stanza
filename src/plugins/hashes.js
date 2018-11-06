import * as hashes from 'iana-hashes';

import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.HASHES_1);

    const names = hashes.getHashes();
    for (const name of names) {
        client.disco.addFeature(Namespaces.HASH_NAME(name));
    }
}
