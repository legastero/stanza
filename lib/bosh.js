"use strict";

var _ = require('underscore');
var util = require('util');
var async = require('async');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var WildEmitter = require('wildemitter');
var stanza = require('jxt');
var BOSH = require('./stanza/bosh');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');


function ConnectionError() {}
util.inherits(ConnectionError, Error);


function retryRequest(opts, timeout, allowedRetries, retries) {
    retries = retries || 0;

    var req = request(opts).cancellable().timeout((timeout || 20) * 1000);

    return req.spread(function (req, body) {
        if (req.statusCode < 200 || req.statusCode >= 400) {
            throw new ConnectionError('HTTP Status Error');
        }
        return body;
    }).catch(Promise.TimeoutError, function () {
        throw new ConnectionError('Dead Connection, exceeded timeout limit');
    }).catch(Promise.CancellationError, function () {
        return; // We only cancel on manual disconnect, so let things die silently
    }).catch(function (err) {
        if (retries < allowedRetries) {
            return Promise.delay(100).then(function () {
                return retryRequest(opts, allowedRetries, retries + 1);
            });
        } else {
            throw new ConnectionError('Dead Connection, exceeded retry limit');
        }
    });
}


function BOSHConnection(sm) {
    var self = this;

    WildEmitter.call(this);

    self.sm = sm;

    self.sendQueue = [];
    self.requests = [];
    self.activeRequests = 0;
    self.sid = '';

    self.on('raw:incoming', function (data) {
        data = data.trim();
        if (data === '') {
            return;
        }

        var bosh;
        try {
            bosh = stanza.parse(BOSH, data);
        } catch (e) {
            console.log('bad data');
            return self.disconnect();
        }

        if (!self.hasStream) {
            self.hasStream = true;
            self.stream = {
                id: bosh.sid,
                lang: bosh.lang || 'en',
                version: bosh.version || '1.0',
                to: bosh.to,
                from: bosh.from
            };
            self.sid = bosh.sid;
            self.maxRequests = bosh.requests;
        }

        var payload = bosh.payload;
        payload.forEach(function (stanzaObj) {
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

        if (bosh.type == 'terminate') {
            self.emit('bosh:terminate', bosh);
            self.emit('stream:end');
            console.log('terminate response');
            self.disconnect();
        }
    });
}

util.inherits(BOSHConnection, WildEmitter);

BOSHConnection.prototype.connect = function (opts) {
    var self = this;

    self.config = _.extend({
        rid: Math.ceil(Math.random() * 9999999999),
        wait: 30
    }, opts);

    self.hasStream = false;
    self.sm.started = false;
    self.url = opts.boshURL;

    self.rid = self.config.rid;

    self.requests = [];

    self.request(new BOSH({
        version: self.config.version || '1.0',
        to: self.config.server,
        lang: self.config.lang || 'en',
        wait: self.config.wait,
        ver: '1.6',
        hold: 1
    }));
};

BOSHConnection.prototype.disconnect = function () {
    if (this.hasStream) {
        this.request(new BOSH({
            type: 'terminate'
        }));

    } else {
        this.emit('disconnected', this);
    }

    this.stream = undefined;
    this.sid = undefined;
    this.rid = undefined;
};

BOSHConnection.prototype.restart = function () {
    var self = this;
    self.request(new BOSH({
        to: self.config.server,
        version: self.config.version || '1.0',
        lang: self.config.lang || 'en',
        restart: true
    }));
};

BOSHConnection.prototype.send = function (data) {
    var self = this;
    if (self.hasStream) {
        self.sm.track(data);
        self.sendQueue.push(data);
        process.nextTick(self.longPoll.bind(self));
    }
};

BOSHConnection.prototype.longPoll = function () {
    var self = this;

    var canReceive = this.requests.length === 0;
    var canSend = this.sendQueue.length > 0 && this.requests.length < this.maxRequests;

    if (!this.sid || (!canReceive && !canSend)) return;

    var stanzas = this.sendQueue;
    this.sendQueue = [];
    this.rid++;

    this.request(new BOSH({
        payload: stanzas
    })).then(function () {
        process.nextTick(self.longPoll.bind(self));
    });
};

BOSHConnection.prototype.request = function (bosh) {
    var self = this;

    bosh.rid = self.rid;
    bosh.sid = self.sid;

    var body = bosh.toString();
    self.emit('raw:outgoing', body);

    var req = retryRequest({
        uri: self.url,
        body: body,
        method: 'POST',
        strictSSL: true
    }, self.config.wait * 1.5, this.config.maxRetries);

    self.requests.push(req);

    return req.then(function (body) {
        self.emit('raw:incoming', body);
        process.nextTick(self.longPoll.bind(self));
    }).catch(ConnectionError, function (err) {
        self.hasStream = false;
        console.log('connection error');
        self.disconnect();
    }).catch(function (err) {
        console.log('generic error', err);
        self.disconnect();
    }).finally(function () {
        self.requests = _.filter(self.requests, function (item) {
            return item !== req;
        });
    });
};

module.exports = BOSHConnection;
