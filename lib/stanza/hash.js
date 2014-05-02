var stanza = require('jxt');

module.exports = stanza.define({
    name: 'hash',
    namespace: 'urn:xmpp:hashes:1',
    element: 'hash',
    fields: {
        algo: stanza.attribute('algo'),
        value: stanza.text()
    }
});
