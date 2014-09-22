'use strict';

var NS = 'http://jabber.org/protocol/rsm';


module.exports = function (stanza) {
    var types = stanza.utils;

    stanza.define({
        name: 'rsm',
        namespace: NS,
        element: 'set',
        fields: {
            after: types.subText(NS, 'after'),
            before: {
                get: function () {
                    return types.getSubText(this.xml, this._NS, 'before');
                },
                set: function (value) {
                    if (value === true) {
                        types.findOrCreate(this.xml, this._NS, 'before');
                    } else {
                        types.setSubText(this.xml, this._NS, 'before', value);
                    }
                }
            },
            count: types.numberSub(NS, 'count', false, 0),
            first: types.subText(NS, 'first'),
            firstIndex: types.subAttribute(NS, 'first', 'index'),
            index: types.subText(NS, 'index'),
            last: types.subText(NS, 'last'),
            max: types.subText(NS, 'max')
        }
    });
};
