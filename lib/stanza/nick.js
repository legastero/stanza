"use strict";

var stanza = require('jxt');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;
var Presence = require('./presence');
var Message = require('./message');


var nick = stanza.subText('http://jabber.org/protocol/nick', 'nick');


stanza.add(Item, 'nick', nick);
stanza.add(EventItem, 'nick', nick);
stanza.add(Presence, 'nick', nick);
stanza.add(Message, 'nick', nick);
