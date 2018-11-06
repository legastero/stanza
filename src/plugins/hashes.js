import * as hashes from 'iana-hashes';


export default function (client) {

    client.disco.addFeature('urn:xmpp:hashes:1');

    const names = hashes.getHashes();
    names.forEach(function (name) {
        client.disco.addFeature('urn:xmpp:hash-function-text-names:' + name);
    });
}
