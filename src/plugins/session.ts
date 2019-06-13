import { Agent } from '../';

export default function(client: Agent) {
    client.registerFeature('session', 1000, async (features, cb) => {
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

    client.on('disconnected', () => {
        client.sessionStarted = false;
        client.features.negotiated.session = false;
    });
}
