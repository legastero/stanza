"use strict";

var _ = require('underscore');
var util = require('util');
var stanza = require('jxt');
var WildEmitter = require('wildemitter');
var async = require('async');
var framing = require('./stanza/framing');
var StreamError = require('./stanza/streamError');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');
var WS = require('faye-websocket') && require('faye-websocket').Client ?
                                      require('faye-websocket').Client :
                                      window.WebSocket;

function WSConnection(sm) {
    var self = this;

    WildEmitter.call(this);

    self.sm = sm;
    self.closing = false;

    self.sendQueue = async.queue(function (data, cb) {
        if (self.conn) {
            self.sm.track(data);

            if (typeof data !== 'string') {
                data = data.toString();
            }

            self.emit('raw:outgoing', data);
            if (self.conn.readyState === self.conn.OPEN) {
                self.conn.send(data);
            }
        }
        cb();
    }, 1);

    function wrap(data) {
        return [self.streamStart, data, self.streamEnd].join('');
    }

    self.on('connected', function () {
        self.send(new framing.Open({
            version: self.config.version || '1.0',
            lang: self.config.lang || 'en',
            to: self.config.server
        }));
    });

    self.on('raw:incoming', function (data) {
        var stanzaObj, ended, err;

        data = data.trim();
        if (data === '') {
            return;
        }

        try {
            stanzaObj = stanza.parse(data);
        } catch (e) {
            err = new StreamError({
                condition: 'invalid-xml'
            });
            self.emit('stream:error', err, e);
            self.send(err);
            return self.disconnect();
        }

        if (stanzaObj._name === 'openStream') {
            self.hasStream = true;
            self.stream = stanzaObj;
            return self.emit('stream:start', stanzaObj);
        }
        if (stanzaObj._name === 'closeStream') {
            self.emit('stream:end');
            return self.disconnect();
        }

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
}

util.inherits(WSConnection, WildEmitter);

WSConnection.prototype.connect = function (opts) {
    var self = this;

    self.config = opts;

    self.hasStream = false;
    self.closing = false;

    self.conn = new WS(opts.wsURL, 'xmpp');
    self.conn.onerror = function (e) {
        e.preventDefault();
        self.emit('disconnected', self);
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
    if (this.conn && !this.closing) {
        this.closing = true;
        this.send(new framing.Close());
    } else {
        this.hasStream = false;
        this.stream = undefined;
        this.sm.failed();
        if (this.conn.readyState === this.conn.OPEN) {
            this.conn.close();
        }
        this.conn = undefined;
    }
};

WSConnection.prototype.restart = function () {
    var self = this;
    self.hasStream = false;
    self.send(new framing.Open({
        version: self.config.version || '1.0',
        lang: self.config.lang || 'en',
        to: self.config.server
    }));
};

WSConnection.prototype.send = function (data) {
    this.sendQueue.push(data);
};


module.exports = WSConnection;
