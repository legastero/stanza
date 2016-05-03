'use strict';

var util = require('util');
var WildEmitter = require('wildemitter');
var async = require('async');

var WS = (require('faye-websocket') && require('faye-websocket').Client) ?
                                       require('faye-websocket').Client :
                                       window.WebSocket;

var WS_OPEN = 1;



function WSConnection(sm, stanzas) {
    var self = this;

    WildEmitter.call(this);

    self.sm = sm;
    self.closing = false;

    self.stanzas = {
        Open: stanzas.getDefinition('open', 'urn:ietf:params:xml:ns:xmpp-framing', true),
        Close: stanzas.getDefinition('close', 'urn:ietf:params:xml:ns:xmpp-framing', true),
        StreamError: stanzas.getStreamError()
    };

    self.sendQueue = async.queue(function (data, cb) {
        if (self.conn) {
            if (typeof data !== 'string') {
                data = data.toString();
            }

            data = new Buffer(data, 'utf8').toString();

            self.emit('raw:outgoing', data);
            if (self.conn.readyState === WS_OPEN) {
                self.conn.send(data);
            }
        }
        cb();
    }, 1);

    self.on('connected', function () {
        self.send(self.startHeader());
    });

    self.on('raw:incoming', function (data) {
        var stanzaObj, err;

        data = data.trim();
        if (data === '') {
            return;
        }

        try {
            stanzaObj = stanzas.parse(data);
        } catch (e) {
            err = new this.stanzas.StreamError({
                condition: 'invalid-xml'
            });
            self.emit('stream:error', err, e);
            self.send(err);
            return self.disconnect();
        }

        if (stanzaObj._name === 'openStream') {
            self.hasStream = true;
            self.stream = stanzaObj;
            return self.emit('stream:start', stanzaObj.toJSON());
        }
        if (stanzaObj._name === 'closeStream') {
            self.emit('stream:end');
            return self.disconnect();
        }

        if (!stanzaObj.lang && self.stream) {
            stanzaObj.lang = self.stream.lang;
        }

        self.emit('stream:data', stanzaObj);
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
        self.emit('raw:incoming', new Buffer(wsMsg.data, 'utf8').toString());
    };
};

WSConnection.prototype.startHeader = function () {
    return new this.stanzas.Open({
        version: this.config.version || '1.0',
        lang: this.config.lang || 'en',
        to: this.config.server
    });
};

WSConnection.prototype.closeHeader = function () {
    return new this.stanzas.Close();
};

WSConnection.prototype.disconnect = function () {
    if (this.conn && !this.closing && this.hasStream) {
        this.closing = true;
        this.send(this.closeHeader());
    } else {
        this.hasStream = false;
        this.stream = undefined;
        if (this.conn) {
            this.conn.close();
        }
        this.conn = undefined;
    }
};

WSConnection.prototype.restart = function () {
    var self = this;
    self.hasStream = false;
    self.send(this.startHeader());
};

WSConnection.prototype.send = function (data) {
    this.sendQueue.push(data);
};


module.exports = WSConnection;
