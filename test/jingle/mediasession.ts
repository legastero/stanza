import test from 'tape';
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

    jingleA.on('send', data => {
        data.from = jingleA.selfID;
        queueB.push(data);
        window.setTimeout(() => {
            const next = queueB.shift();
            if (next) {
                jingleB.process(next);
            }
        }, 0);
    });
    jingleB.on('send', data => {
        data.from = jingleB.selfID;
        queueA.push(data);
        window.setTimeout(() => {
            const next = queueA.shift();
            if (next) {
                jingleA.process(next);
            }
        }, 0);
    });
    return [jingleA, jingleB];
}

test('Test bidirectional AV session', t => {
    const managers = setupSessionManagers();
    navigator.mediaDevices
        .getUserMedia({ audio: true, video: true, fake: true } as any)
        .then(stream => {
            t.pass('got media stream');

            managers[1].on('incoming', session => {
                t.pass('peer got incoming session');
                // testing bidirectional here
                for (const track of stream.getTracks()) {
                    session.addTrack(track, stream);
                }
                session.accept();
            });

            const sess = managers[0].createMediaSession(managers[1].selfID);
            for (const track of stream.getTracks()) {
                sess.addTrack(track, stream);
            }
            t.pass('added stream to session');
            sess.start();
            t.pass('started session');
            managers[1].on('change:sessionState', s => {
                if (s.state === 'active') {
                    t.pass('session was accepted');
                }
            });
            managers[1].on('change:connectionState', s => {
                if (s.connectionState === 'connected') {
                    t.pass('P2P connection established');
                    t.end();
                }
            });
        })
        .catch(err => {
            t.fail('getUserMedia error' + err.toString());
        });
});
