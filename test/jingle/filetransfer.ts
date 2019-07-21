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

function getFile() {
    // the otalk logo
    const otalkLogo =
        'data:image/png;base64,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';
    const data = otalkLogo.match(/data:([^;]*);(base64)?,([0-9A-Za-z+/]+)/);
    const raw = atob(data[3]);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        arr[i] = raw.charCodeAt(i);
    }
    const file = new Blob([arr], { type: data[1] }) as any;
    file.name = 'somename';
    file.lastModifiedDate = new Date();
    return file;
}

test('filetransfer', t => {
    const sendFile = getFile();
    const managers = setupSessionManagers();
    managers[1].on('incoming', session => {
        t.pass('peer got incoming session');
        // FIXME: test it is a file transfer session
        session.accept();
    });
    managers[1].on('receivedFile', (session, file, metadata) => {
        t.pass('file was received');
        t.ok(sendFile.name === metadata.name, 'filename received by peer');
        t.ok(sendFile.size === metadata.size, 'size was received by peer');
        t.end();
    });

    managers[0].on('sentFile', (session, metadata) => {
        t.ok(metadata.hash !== '', 'hash was calculated on the sender side');
        t.pass('file was sent');
    });

    const sess = managers[0].createFileTransferSession(managers[1].selfID);
    managers[0].on('change:sessionState', s => {
        if (s.state === 'active') {
            t.pass('session was accepted');
        }
    });
    managers[0].on('change:connectionState', s => {
        if (s.connectionState === 'connected') {
            t.pass('P2P connection established');
        }
    });
    sess.start(sendFile);
});
