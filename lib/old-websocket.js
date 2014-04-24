"use strict";

var WSConnection = require('./websocket');
var _ = require('underscore');
var util = require('util');
var stanza = require('jxt');
var Stream = require('./stanza/stream');
var StreamError = require('./stanza/streamError');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');

var WS_OPEN = 1;


function OldWSConnection(sm) {
    WSConnection.call(this, sm);

    var self = this;


    function wrap(data) {
        return [self.streamStart, data, self.streamEnd].join('');
    }


    self.on('connected', function () {
        self.streamStart = '<stream:stream xmlns:stream="http://etherx.jabber.org/streams">';
        self.streamEnd = '</stream:stream>';
    });

    self.off('raw:incoming');
    self.on('raw:incoming', function (data) {
        var streamData, ended, err;

        data = data.trim();
        data = data.replace(/^(\s*<\?.*\?>\s*)*/, '');
        if (data === '') {
            return;
        }

        if (data.match(self.streamEnd)) {
            return self.disconnect();
        } else if (self.hasStream) {
            try {
                streamData = stanza.parse(wrap(data), Stream);
            } catch (e) {
                err = new StreamError({
                    condition: 'invalid-xml'
                });
                self.emit('stream:error', err, e);
                self.send(err);
                return self.disconnect();
            }
        } else {
            // Inspect start of stream element to get NS prefix name
            var parts = data.match(/^<(\S+:)?(\S+) /);
            self.streamStart = data;
            self.streamEnd = '</' + (parts[1] || '') + parts[2] + '>';

            ended = false;
            try {
                streamData = stanza.parse(data + self.streamEnd, Stream);
            } catch (e) {
                try {
                    streamData = stanza.parse(data, Stream);
                    ended = true;
                } catch (e2) {
                    err = new StreamError({
                        condition: 'invalid-xml'
                    });
                    self.emit('stream:error', err, e2);
                    self.send(err);
                    return self.disconnect();
                }
            }

            self.hasStream = true;
            self.stream = streamData;
            self.emit('stream:start', streamData);
        }

        _.each(streamData._extensions, function (stanzaObj) {
            if (!stanzaObj.lang) {
                stanzaObj.lang = self.stream.lang;
            }

            self.emit('stream:data', stanzaObj);
        });

        if (ended) {
            self.emit('stream:end');
        }
    });
}

util.inherits(OldWSConnection, WSConnection);


OldWSConnection.prototype.startHeader = function () {
    return [
        '<stream:stream',
        'xmlns:stream="http://etherx.jabber.org/streams"',
        'xmlns="jabber:client"',
        'version="' + (this.config.version || '1.0') + '"',
        'xml:lang="' + (this.config.lang || 'en') + '"',
        'to="' + this.config.server + '">'
    ].join(' ');
};

OldWSConnection.prototype.closeHeader = function () {
    return '</stream:stream>';
};


module.exports = OldWSConnection;
