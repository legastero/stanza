import request from 'request';
import WildEmitter from 'wildemitter';

import { Namespaces } from '../protocol';

function timeoutPromise(targetPromise, delay) {
    let timeoutRef;
    return Promise.race([
        targetPromise,
        new Promise(function(resolve, reject) {
            timeoutRef = setTimeout(function() {
                reject();
            }, delay);
        })
    ]).then(function(result) {
        clearTimeout(timeoutRef);
        return result;
    });
}

function delayPromise(delay) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, delay);
    });
}

function makeRequest(opts) {
    return new Promise(function(resolve, reject) {
        request(opts, function(err, result, body) {
            if (err) {
                return reject(err);
            } else {
                return resolve([result, body]);
            }
        });
    });
}

function retryRequest(opts, timeout, allowedRetries) {
    return timeoutPromise(makeRequest(opts), (timeout || 20) * 1000)
        .then(function(result) {
            const req = result[0];
            const body = result[1];

            if (req.statusCode < 200 || req.statusCode >= 400) {
                throw new Error('HTTP Status Error' + req.statusCode);
            }
            return body;
        })
        .catch(function() {
            if (allowedRetries > 0) {
                return delayPromise(1000).then(function() {
                    return retryRequest(opts, timeout, allowedRetries - 1);
                });
            } else {
                throw new Error('Dead Connection, exceeded retry limit');
            }
        });
}

export default class BOSHConnection extends WildEmitter {
    constructor(sm, stanzas) {
        super();

        const self = this;
        self.sm = sm;
        self.stanzas = {
            BOSH: stanzas.getDefinition('body', Namespaces.BOSH),
            StreamError: stanzas.getStreamError()
        };
        self.sendQueue = [];
        self.requests = [];
        self.maxRequests = undefined;
        self.sid = '';
        self.authenticated = false;

        self.on('raw:incoming', function(data) {
            data = data.trim();
            if (data === '') {
                return;
            }
            let bosh;
            let err;
            try {
                bosh = stanzas.parse(data, self.stanzas.BOSH);
            } catch (e) {
                err = new self.stanzas.StreamError({
                    condition: 'invalid-xml'
                });
                self.emit('stream:error', err, e);
                self.send(err);
                return self.disconnect();
            }
            if (!self.hasStream) {
                self.hasStream = true;
                self.stream = {
                    from: bosh.from,
                    id: bosh.sid || self.sid,
                    lang: bosh.lang || 'en',
                    to: bosh.to,
                    version: bosh.version || '1.0'
                };
                self.sid = bosh.sid || self.sid;
                self.maxRequests = bosh.requests || self.maxRequests;
            }
            const payload = bosh.payload;
            for (const stanzaObj of payload) {
                if (!stanzaObj.lang) {
                    stanzaObj.lang = self.stream.lang;
                }
                self.emit('stream:data', stanzaObj);
            }
            if (bosh.type === 'terminate') {
                self.rid = undefined;
                self.sid = undefined;
                self.emit('bosh:terminate', bosh);
                self.emit('stream:end');
                self.emit('disconnected', self);
            }
        });
    }

    connect(opts) {
        const self = this;
        self.config = {
            maxRetries: 5,
            rid: Math.ceil(Math.random() * 9999999999),
            wait: 30,
            ...opts
        };
        self.hasStream = false;
        self.sm.started = false;
        self.url = opts.boshURL;
        self.sid = self.config.sid;
        self.rid = self.config.rid;
        self.requests = [];
        if (self.sid) {
            self.hasStream = true;
            self.stream = {};
            self.emit('connected', self);
            self.emit('session:prebind', self.config.jid);
            self.emit('session:started');
            return;
        }
        self.rid++;
        self.request(
            new self.stanzas.BOSH({
                hold: 1,
                lang: self.config.lang || 'en',
                to: self.config.server,
                ver: '1.6',
                version: self.config.version || '1.0',
                wait: self.config.wait
            })
        );
    }

    disconnect() {
        if (this.hasStream) {
            this.rid++;
            this.request(
                new this.stanzas.BOSH({
                    type: 'terminate'
                })
            );
        } else {
            this.stream = undefined;
            this.sid = undefined;
            this.rid = undefined;
            this.emit('disconnected', this);
        }
    }

    restart() {
        const self = this;
        self.rid++;
        self.request(
            new self.stanzas.BOSH({
                lang: self.config.lang || 'en',
                restart: 'true',
                to: self.config.server
            })
        );
    }

    send(data) {
        const self = this;
        if (self.hasStream) {
            self.sendQueue.push(data);
            process.nextTick(self.longPoll.bind(self));
        }
    }

    longPoll() {
        const canReceive = !this.maxRequests || this.requests.length < this.maxRequests;
        const canSend =
            !this.maxRequests ||
            (this.sendQueue.length > 0 && this.requests.length < this.maxRequests);
        if (!this.sid || (!canReceive && !canSend)) {
            return;
        }
        const stanzas = this.sendQueue;
        this.sendQueue = [];
        this.rid++;
        this.request(
            new this.stanzas.BOSH({
                payload: stanzas
            })
        );
    }

    request(bosh) {
        const self = this;
        const ticket = { id: self.rid, request: null };
        bosh.rid = self.rid;
        bosh.sid = self.sid;
        const body = Buffer.from(bosh.toString(), 'utf8').toString();
        self.emit('raw:outgoing', body);
        self.emit('raw:outgoing:' + ticket.id, body);
        self.requests.push(ticket);
        const req = retryRequest(
            {
                body: body,
                headers: {
                    'Content-Type': 'text/xml'
                },
                method: 'POST',
                strictSSL: true,
                uri: self.url
            },
            self.config.wait * 1.5,
            this.config.maxRetries
        )
            .catch(function(err) {
                self.hasStream = false;
                const serr = new self.stanzas.StreamError({
                    condition: 'connection-timeout'
                });
                self.emit('stream:error', serr, err);
                self.disconnect();
            })
            .then(function(respBody) {
                self.requests = self.requests.filter(item => {
                    return item.id !== ticket.id;
                });
                if (respBody) {
                    respBody = Buffer.from(respBody, 'utf8').toString();
                    self.emit('raw:incoming', respBody);
                    self.emit('raw:incoming:' + ticket.id, respBody);
                }
                // do not (re)start long polling if terminating, or request is pending, or before authentication
                if (
                    self.hasStream &&
                    bosh.type !== 'terminate' &&
                    !self.requests.length &&
                    self.authenticated
                ) {
                    // Delay next auto-request by two ticks since we're likely
                    // to send data anyway next tick.
                    process.nextTick(function() {
                        process.nextTick(self.longPoll.bind(self));
                    });
                }
            });
        ticket.request = req;
        return req;
    }
}
