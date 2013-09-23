var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'stream',
    namespace: 'http://etherx.jabber.org/streams',
    element: 'stream',
    fields: {
        lang: {
            get: function () {
                return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
            },
            set: function (value) {
                this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
            }
        },
        id: stanza.attribute('id'),
        version: stanza.attribute('version', '1.0'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from')
    }
});
