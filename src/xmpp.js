var Client = require('node-xmpp').Client,
    ltx = require('ltx'),
    EventEmitter = require('events').EventEmitter,
    uuid = require('node-uuid'),
    stanzaUtil = require('./stanza');

exports.XMPP = function (socket) {
    EventEmitter.call(this);

    var self = this;
    this.socket = socket;

    this.socket.on('login', function (data) { 
        self.login(data.jid, data.password);
    });
    this.socket.on('presence', function (data) {
        data = data || {};
        data._ = 'presence';
        self.send(data);
    });
    this.socket.on('message', function (data) {
        data = data || {};
        data._ = 'message';
        self.send(data);
    });

    this.socket.on('chat', function (data) {
        data = data || {};
        data._ = 'message';
        self.send(data);
    });

    this.socket.on('subscribe', function (data) {
        data = data || {};
        data._ = 'presence';
        self.send(data);
    });
    this.socket.on('unsubscribe', function (data) {
        data = data || {};
        data._ = 'presence';
        self.send(data);
    });
    this.socket.on('away', function (data) {
        data = data || {};
        data._ = 'presence';
        data.show = 'away';
        self.send(data);
    });
    this.socket.on('idle', function (data) {
        data = data || {};
        data._ = 'presence';
        data.show = 'xa';
        self.send(data);
    });
    this.socket.on('busy', function (data) {
        data = data || {};
        data._ = 'presence';
        data.show = 'dnd';
        self.send(data);
    });
    this.socket.on('roster', function (data, cb) {
        data = data || {};
        data._ = 'iq';
        data.id = data.id || uuid.v1();
        data.type = data.type || 'get';
        data.payload = data.payload || {};
        data.payload._ = 'roster';
        if (cb) {
            self.once('id:' + data.id, function(resp) {
                cb(resp);
            });
        }
        self.send(data);
    });
};

exports.XMPP.prototype = Object.create(EventEmitter.prototype);
exports.XMPP.prototype.constructor = exports.XMPP;


exports.XMPP.prototype.login = function (jid, password) {
    var self = this;

    console.log("Attempting to connect to " + jid);
    this.client = new Client({jid: jid, password: password});

    this.client.on('error', function (error) { 
        self.socket.emit('error', error);
    });
    this.client.on('online', function () { 
        self.socket.emit('connection', 'online');
    });
    this.client.on('stanza', function (data) { 
        // Node-XMPP doesn't return stanza elements with the proper namespace
        data.attrs.xmlns = 'jabber:client';

        var stanza = stanzaUtil.json(data);
        self.socket.emit(stanza._, stanza);

        // Answer callbacks with Iq results
        self.emit('id:' + stanza.id, stanza);

        if (stanza._ === 'message') {
            if (stanza.body) {
                self.socket.emit('chat', stanza);
            }

            if (stanza.chatState) {
                self.socket.emit('chatState', stanza);
            }
        } else if (stanza._ === 'presence') {
            if (stanza.type) {
                self.socket.emit(stanza.type, stanza);
            } else {
                self.socket.emit('available', stanza);
                if (stanza.show) {
                    self.socket.emit(stanza.show, stanza);
                }
            }
        } else if (stanza._ === 'iq') {
            if (stanza.payload) {
                if (stanza.payload._ === 'roster' && (stanza.type === 'result' || stanza.type === 'set')) {
                    self.socket.emit('roster', stanza);
                }
            }
        }
    });
};

exports.XMPP.prototype.send = function (data, cb) {
    console.log(data);
    var xml = stanzaUtil.xml(data);
    console.log(xml.toString());
    this.client.send(xml);
};

exports.use = function (io) {
    io.of('/xmpp').on('connection', function (socket) {
        new exports.XMPP(socket);
    });
};
