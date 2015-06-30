'use strict';

var JID = require('xmpp-jid').JID;


module.exports = function (client, stanzas, config) {

    client.registerFeature('bind', 300, function (features, cb) {
        var self = this;

        self.sendIq({
            type: 'set',
            bind: {
                resource: config.resource
            }
        }, function (err, resp) {
            if (err) {
                self.emit('session:error', err);
                return cb('disconnect', 'JID binding failed');
            }

            self.features.negotiated.bind = true;
            self.jid = new JID(resp.bind.jid);
            self.emit('session:bound', self.jid);

            var canStartSession = !features.session || (features.session && features.session.optional);
            if (!self.sessionStarted && canStartSession) {
                self.sessionStarted = true;
                self.emit('session:started', self.jid);
            }
            return cb();
        });
    });

    client.on('disconnected', function () {
        client.sessionStarted = false;
        client.features.negotiated.bind = false;
    });
};
