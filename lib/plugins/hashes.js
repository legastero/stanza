'use strict';

module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:hashes:1');
    client.disco.addFeature('urn:xmpp:hash-function-text-names:md5');
    client.disco.addFeature('urn:xmpp:hash-function-text-names:sha-1');
    client.disco.addFeature('urn:xmpp:hash-function-text-names:sha-256');
};
