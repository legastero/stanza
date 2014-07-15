'use strict';

var stanza = require('jxt');
var jingle = require('./jingle');


var NS = 'http://talky.io/ns/datachannel';


exports.DataChannel = stanza.define({
    name: '_datachannel',
    namespace: NS,
    element: 'description',
    fields: {
        descType: {value: 'datachannel'},
    }
});

stanza.extend(jingle.Content, exports.DataChannel);
