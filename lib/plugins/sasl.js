'use strict';


var NS = 'urn:ietf:params:xml:ns:xmpp-sasl';


module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/sasl'));

    var Auth = stanzas.getDefinition('auth', NS);
    var Response = stanzas.getDefinition('response', NS);

    client.registerFeature('sasl', 100, function (features, cb) {
        var self = this;

        var mech = self.SASLFactory.create(features.sasl.mechanisms);
        if (!mech) {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            return cb('disconnect', 'authentication failed');
        }

        self.on('sasl:success', 'sasl', function () {
            self.features.negotiated.sasl = true;
            self.releaseGroup('sasl');
            self.emit('auth:success', self.config.credentials);
            cb('restart');
        });

        self.on('sasl:challenge', 'sasl', function (challenge) {
            mech.challenge(challenge.value);
            self.send(new Response({
                value: mech.response(self.getCredentials())
            }));

            if (mech.cache) {
                Object.keys(mech.cache).forEach(function (key) {
                    if (!mech.cache[key]) {
                        return;
                    }

                    self.config.credentials[key] = new Buffer(mech.cache[key]);
                });

                self.emit('credentials:update', self.config.credentials);
            }
        });

        self.on('sasl:failure', 'sasl', function () {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            cb('disconnect', 'authentication failed');
        });

        self.on('sasl:abort', 'sasl', function () {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            cb('disconnect', 'authentication failed');
        });

        var auth = {
            mechanism: mech.name
        };

        if (mech.clientFirst) {
            auth.value = mech.response(self.getCredentials());
        }

        self.send(new Auth(auth));
    });

    client.on('disconnected', function () {
        client.features.negotiated.sasl = false;
    });
};
