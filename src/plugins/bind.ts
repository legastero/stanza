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

    client.on('session:started', () => {
        client.sessionStarted = true;
    });

    client.on('session:prebind', boundJID => {
        client.jid = boundJID;
        client.emit('session:bound', client.jid);
    });

    client.on('disconnected', () => {
        client.sessionStarted = false;
        client.features.negotiated.bind = false;
    });
}
