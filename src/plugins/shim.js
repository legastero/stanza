'use strict';

var NS = 'http://jabber.org/protocol/shim';


export default function (client) {

    client.disco.addFeature(NS);
    client.disco.addFeature(NS + '#SubID', NS);
}
