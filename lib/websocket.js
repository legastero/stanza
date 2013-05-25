var WildEmitter = require('wildemitter'),
    _ = require('lodash'),
    async = require('async'),
    stanza = require('./stanza/stanza'),
    Stream = require('./stanza/stream').Stream,
    Message = require('./stanza/message').Message,
    Presence = require('./stanza/presence').Presence,
    Iq = require('./stanza/iq').Iq,
    SM = require('./stanza/sm'),
    uuid = require('node-uuid');


function mod(v, n) {
    return ((v % n) + n) % n;
}


function WSConnection() {
    var self = this;

    WildEmitter.call(this);

    this.sm = {
        lastAck: 0,
        windowSize: 1,
        windowCount: 0,
        id: false,
        handled: 0,
        seq: 0,
        maxSeq: Math.pow(2, 32),
        allowResume: true,
        _enabled: false,
        _started: false,
        unacked: [],
        enable: function () {
            var enable = new SM.Enable();
            enable.resume = self.sm.allowResume;
            self.send(enable);
            self.sm.handled = 0;
            self.sm._started = true;
        },
        resume: function () {
            var resume = new SM.Resume();
            resume.h = self.sm.handled;
            resume.previd = self.sm.id;
            self.send(resume);
            self.sm._started = true;
        },
        enabled: function (resp) {
            self.sm._enabled = true;
            self.sm.id = resp.id;

            if (resp.h) {
                self.sm.procAck(resp, true);
            }
        },
        failed: function () {
            self.sm._started = false;
            self.sm._enabled = false;
            self.sm.unacked = [];
        },
        ack: function () {
            var ack = new SM.Ack();
            ack.h = self.sm.handled;
            self.send(ack);
        },
        request: function () {
            self.send(new SM.Request());
        },
        procAck: function (ack, resend) {
            var numAcked = mod(ack.h - self.sm.lastAck, self.sm.maxSeq),
                numUnacked = self.sm.unacked.length,
                data;
            for(var i = 0; i < numAcked && self.sm.unacked.length > 0; i++) {
                self.emit('stanza:acked', self.sm.unacked.shift());
            }
            if (resend) {
                var resend = self.sm.unacked;
                self.sm.unacked = [];
                resend.forEach(function (stanza) {
                    self.send(stanza);
                });
            }
            self.sm.lastAck = ack.h;
        }
    };

    self.sendQueue = async.queue(function (data, cb) {
        if (self.conn) {
            self.emit('raw:outgoing', data);

            if (self.sm._started && (data._name == 'message' || data._name == 'presence' || data._name == 'iq')) {
                self.sm.unacked.push(data);
                self.sm.windowCount += 1;
                if (self.sm.windowCount == self.sm.windowSize) {
                    self.sm.request();
                    self.windowCount = 0;
                }
            }

            if (typeof data !== 'string') {
                data = data.toString();
            }

            self.conn.send(data);
        }
        cb();
    }, 1);

    function wrap(data) {
        var result = [self.streamStart, data, self.streamEnd].join('');
        return result;
    }

    function parse(data) {
        return (self.parser.parseFromString(data, 'application/xml')).childNodes[0];
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
        if (data.match(self.streamEnd)) {
            return self.disconnect();
        } else if (self.hasStream) {
            try {
                streamData = new Stream({}, parse(wrap(data)));
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
                streamData = new Stream({}, parse(data + self.streamEnd));
            } catch (e) {
                try {
                    streamData = new Stream({}, parse(data));
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

            if (stanzaObj._name === 'message' || stanzaObj._name === 'presence' || stanzaObj._name === 'iq') {
                if (self.sm._started) {
                    self.sm.handled = mod(self.sm.handled + 1, self.sm.maxSeq);
                }
                self.emit('stanza', stanzaObj);
            }
            self.emit(stanzaObj._eventname || stanzaObj._name, stanzaObj);
            self.emit('stream:data', stanzaObj);

            if (stanzaObj.id) {
                self.emit('id:' + stanzaObj.id, stanzaObj);
            }
        });

        if (ended) {
            self.emit('stream:end');
        }
    });
}

WSConnection.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: WSConnection
    }
});

WSConnection.prototype.connect = function (opts) {
    var self = this;

    self.config = opts;

    self.hasStream = false;
    self.streamStart = '<stream:stream xmlns:stream="http://etherx.jabber.org/streams">';
    self.streamEnd = '</stream:stream>';
    self.parser = new DOMParser();
    self.serializer = new XMLSerializer();

    self.conn = new WebSocket(opts.wsURL, 'xmpp');

    self.conn.onopen = function () {
        self.emit('connected', self);
    };

    self.conn.onclose = function () {
        self.emit('disconnected', self);
    };

    self.conn.onmessage = function (wsMsg) {
        self.emit('raw:incoming', wsMsg.data);
    };
};

WSConnection.prototype.disconnect = function () {
    if (this.conn) {
        if (this.hasStream) {
            this.conn.send('</stream:stream>')
            this.emit('stream:end');
        }
        this.hasStream = false;
        this.conn.close();
        this.stream = undefined;
        this.conn = undefined;
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

exports.WSConnection = WSConnection;
