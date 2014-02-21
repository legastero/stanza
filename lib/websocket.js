"use strict";

var _ = require('underscore');
var util = require('util');
var stanza = require('jxt');
var WildEmitter = require('wildemitter');
var async = require('async');
var Stream = require('./stanza/stream');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');


function WSConnection(sm) {
    var self = this;

    WildEmitter.call(this);

    self.sm = sm;

    self.sendQueue = async.queue(function (data, cb) {
        if (self.conn) {
            self.sm.track(data);

            if (typeof data !== 'string') {
                data = data.toString();
            }

            self.emit('raw:outgoing', data);
            self.conn.send(data);
        }
        cb();
    }, 1);

    function wrap(data) {
        return [self.streamStart, data, self.streamEnd].join('');
    }

    self.on('connected', function () {
        self.send([
            '<stream:stream',
            'xmlns:stream="http://etherx.jabber.org/streams"',
            'xmlns="jabber:client"',
            'version="' + (self.config.version || '1.0') + '"',
            'xml:lang="' + (self.config.lang || 'en') + '"',
            'to="' + self.config.server + '">'
        ].join(' '));
    });

    self.on('raw:incoming', function (data) {
        var streamData, ended;

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
            self.emit(stanzaObj._eventname || stanzaObj._name, stanzaObj);
            if (stanzaObj._name === 'message' || stanzaObj._name === 'presence' || stanzaObj._name === 'iq') {
                self.sm.handle(stanzaObj);
                self.emit('stanza', stanzaObj);
            } else if (stanzaObj._name === 'smAck') {
                return self.sm.process(stanzaObj);
            } else if (stanzaObj._name === 'smRequest') {
                return self.sm.ack();
            }

            if (stanzaObj.id) {
                self.emit('id:' + stanzaObj.id, stanzaObj);
            }
        });

        if (ended) {
            self.emit('stream:end');
        }
    });
}

util.inherits(WSConnection, WildEmitter);

WSConnection.prototype.connect = function (opts) {
    var self = this;

    self.config = opts;

    self.hasStream = false;
    self.streamStart = '<stream:stream xmlns:stream="http://etherx.jabber.org/streams">';
    self.streamEnd = '</stream:stream>';

    self.conn = new WebSocket(opts.wsURL, 'xmpp');
    self.conn.onerror = function (e) {
        e.preventDefault();
        self.emit('disconnected', self);
        return false;
    };

    self.conn.onclose = function () {
        self.emit('disconnected', self);
    };

    self.conn.onopen = function () {
        self.sm.started = false;
        self.emit('connected', self);
    };

    self.conn.onmessage = function (wsMsg) {
        self.emit('raw:incoming', wsMsg.data);
    };
};

WSConnection.prototype.disconnect = function () {
    if (this.conn) {
        if (this.hasStream) {
            this.conn.send('</stream:stream>');
            this.emit('raw:outgoing', '</stream:stream>');
            this.emit('stream:end');
        }
        this.hasStream = false;
        this.conn.close();
        this.stream = undefined;
        this.conn = undefined;
        this.sm.failed();
    } else {
        this.emit('disconnected', this);
    }
};

WSConnection.prototype.restart = function () {
    var self = this;
    self.hasStream = false;
    self.send([
        '<stream:stream',
        'xmlns:stream="http://etherx.jabber.org/streams"',
        'xmlns="jabber:client"',
        'version="' + (self.config.version || '1.0') + '"',
        'xml:lang="' + (self.config.lang || 'en') + '"',
        'to="' + self.config.server + '">'
    ].join(' '));
};

WSConnection.prototype.send = function (data) {
    this.sendQueue.push(data);
};


module.exports = WSConnection;
