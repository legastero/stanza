import StreamManagement from '../src/helpers/StreamManagement';
import { sleep } from '../src/Utils';

test('Handled unacked on resume', () => {
    let cache: any;
    let acked: any[] = [];
    let resent: any[] = [];

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.on('acked', data => acked.push(data));

    sm1.bind('test-jid');
    sm1.enable();
    sm1.track('sm', { type: 'enable' });

    sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    sm1.track('message', { body: 'message 1' });
    sm1.track('message', { body: 'message 2' });
    sm1.track('message', { body: 'message 3' });
    sm1.track('message', { body: 'message 4' });
    sm1.process({ type: 'ack', handled: 1 });
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.on('prebound', jid => expect(jid).toBe('test-jid'));

    sm2.load(cache);

    sm2.on('acked', data => acked.push(data));
    sm2.on('resend', data => resent.push(data));

    sm2.resume();
    sm2.resumed({ type: 'resumed', handled: 2, previousSession: 'test' });

    expect(acked).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 1' } },
        { kind: 'message', stanza: { body: 'message 2' } }
    ]);
    expect(resent).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 3' } },
        { kind: 'message', stanza: { body: 'message 4' } }
    ]);
});

test('Handled failed with known handled', () => {
    let cache: any;
    let acked: any[] = [];
    let failed: any[] = [];

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.on('acked', data => acked.push(data));

    sm1.enable();
    sm1.track('sm', { type: 'enable' });

    sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    sm1.track('message', { body: 'message 1' });
    sm1.track('message', { body: 'message 2' });
    sm1.track('message', { body: 'message 3' });
    sm1.track('message', { body: 'message 4' });
    sm1.process({ type: 'ack', handled: 1 });
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.load(cache);

    sm2.on('acked', data => acked.push(data));
    sm2.on('failed', data => failed.push(data));

    sm2.resume();
    sm2.failed({ type: 'failed', handled: 2 });

    expect(acked).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 1' } },
        { kind: 'message', stanza: { body: 'message 2' } }
    ]);
    expect(failed).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 3' } },
        { kind: 'message', stanza: { body: 'message 4' } }
    ]);
});

test('Handled failed with unknown handled', () => {
    let cache: any;
    let acked: any[] = [];
    let failed: any[] = [];

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.on('acked', data => acked.push(data));

    sm1.enable();
    sm1.track('sm', { type: 'enable' });

    sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    sm1.track('message', { body: 'message 1' });
    sm1.track('message', { body: 'message 2' });
    sm1.track('message', { body: 'message 3' });
    sm1.track('message', { body: 'message 4' });

    sm1.request();
    sm1.process({ type: 'ack', handled: 1 });
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.load(cache);

    sm2.on('acked', data => acked.push(data));
    sm2.on('failed', data => failed.push(data));

    sm2.resume();
    sm2.failed({ type: 'failed' });

    expect(acked).toStrictEqual([{ kind: 'message', stanza: { body: 'message 1' } }]);
    expect(failed).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 2' } },
        { kind: 'message', stanza: { body: 'message 3' } },
        { kind: 'message', stanza: { body: 'message 4' } }
    ]);
});
