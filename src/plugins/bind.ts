import { Agent } from '../';

export default function(client: Agent) {
    client.registerFeature('bind', 300, async (features, cb) => {
        try {
            const resp = await client.sendIQ({
                bind: {
                    resource: client.config.resource
                },
                type: 'set'
            });

            client.features.negotiated.bind = true;
            client.emit('session:prebind', resp.bind.jid!);

            const canStartSession =
                !features.legacySession ||
                (features.legacySession && features.legacySession.optional);
            if (!client.sessionStarted && canStartSession) {
                client.emit('session:started', client.jid);
            }
            return cb();
        } catch (err) {
            console.error(err);
            return cb('disconnect', 'JID binding failed');
        }
    });

    client.registerFeature('legacySession', 1000, async (features, cb) => {
        if (client.sessionStarted || (features.legacySession && features.legacySession.optional)) {
            client.features.negotiated.session = true;
            return cb();
        }

        try {
            await client.sendIQ({
                legacySession: true,
                type: 'set'
            });

            client.features.negotiated.session = true;
            if (!client.sessionStarted) {
                client.sessionStarted = true;
                client.emit('session:started', client.jid);
            }
            return cb();
        } catch (err) {
            return cb('disconnect', 'Session requeset failed');
        }
    });

    client.on('session:started', () => {
        client.sessionStarted = true;
    });

    client.on('session:prebind', boundJID => {
        client.jid = boundJID;
        client.emit('session:bound', client.jid);
    });

    client.on('--reset-stream-features', () => {
        client.sessionStarted = false;
        client.features.negotiated.bind = false;
        client.features.negotiated.session = false;
    });
}
