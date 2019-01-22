const test = require('tape');
import { SessionManager } from '../../src/jingle';

function setupSessionManagers() {
    const jingleA = new SessionManager({
        selfID: 'userA@example.com/foo'
    });
    const queueA = [];
    const jingleB = new SessionManager({
        selfID: 'userB@example.com/bar'
    });
    const queueB = [];

    jingleA.on('send', function(data) {
        data.from = jingleA.jid;
        queueB.push(data);
        window.setTimeout(function() {
            const next = queueB.shift();
            if (next) {
                jingleB.process(next);
            }
        }, 0);
    });
    jingleB.on('send', function(data) {
        data.from = jingleB.jid;
        queueA.push(data);
        window.setTimeout(function() {
            const next = queueA.shift();
            if (next) {
                jingleA.process(next);
            }
        }, 0);
    });
    return [jingleA, jingleB];
}

test('Test bidirectional AV session', function(t) {
    const managers = setupSessionManagers();
    navigator.mediaDevices
        .getUserMedia({ audio: true, video: true, fake: true })
        .then(function(stream) {
            t.pass('got media stream');

            managers[1].on('incoming', function(session) {
                t.pass('peer got incoming session');
                // testing bidirectional here
                session.addStream(stream);
                session.accept();
            });

            const sess = managers[0].createMediaSession(managers[1].jid);
            sess.addStream(stream);
            t.pass('added stream to session');
            sess.start();
            t.pass('started session');
            sess.on('change:sessionState', function() {
                if (sess.state === 'active') {
                    t.pass('session was accepted');
                }
            });
            sess.on('change:connectionState', function() {
                if (sess.connectionState === 'connected') {
                    t.pass('P2P connection established');
                    t.end();
                }
            });
        })
        .catch(function(err) {
            t.fail('getUserMedia error' + err.toString());
        });
});
