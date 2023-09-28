import StreamManagement from '../src/helpers/StreamManagement';

test('Failed response to enable request', async () => {
    const sm = new StreamManagement();
    await sm.enable();
    await sm.track('sm', { type: 'enable' });
    await sm.failed( { type: 'failed'});
    expect(sm.started).toStrictEqual(false);
    expect(sm.resumable).toStrictEqual(false);
});

test('Enabled response without resume attribute', async () => {
    const sm = new StreamManagement();
    await sm.enable();
    await sm.track('sm', { type: 'enable' });
    await sm.enabled({ id: 'test', type: 'enabled' });
    expect(sm.started).toStrictEqual(true);
    expect(sm.resumable).toStrictEqual(false);
});

test('Enabled response with positive resume attribute', async () => {
    const sm = new StreamManagement();
    await sm.enable();
    await sm.track('sm', { type: 'enable' });
    await sm.enabled({ id: 'test', resume: true, type: 'enabled' });
    expect(sm.started).toStrictEqual(true);
    expect(sm.resumable).toStrictEqual(true);
});

test('Enabled response with negative resume attribute', async () => {
    const sm = new StreamManagement();
    await sm.enable();
    await sm.track('sm', { type: 'enable' });
    await sm.enabled({ id: 'test', resume: false, type: 'enabled' });
    expect(sm.started).toStrictEqual(true);
    expect(sm.resumable).toStrictEqual(false);
});

test('Handled unacked on resume', async () => {
    let cache: any;
    const acked: any[] = [];
    const resent: any[] = [];

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.on('acked', data => acked.push(data));

    sm1.bind('test-jid');
    await sm1.enable();
    await sm1.track('sm', { type: 'enable' });

    await sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    await sm1.track('message', { body: 'message 1' });
    await sm1.track('message', { body: 'message 2' });
    await sm1.track('message', { body: 'message 3' });
    await sm1.track('message', { body: 'message 4' });
    await sm1.process({ type: 'ack', handled: 1 });
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.on('prebound', jid => expect(jid).toBe('test-jid'));

    sm2.load(cache);

    sm2.on('acked', data => acked.push(data));
    sm2.on('resend', data => resent.push(data));

    await sm2.resume();
    await sm2.resumed({ type: 'resumed', handled: 2, previousSession: 'test' });

    expect(acked).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 1' } },
        { kind: 'message', stanza: { body: 'message 2' } }
    ]);
    expect(resent).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 3' } },
        { kind: 'message', stanza: { body: 'message 4' } }
    ]);
});

test('Handled failed with known handled', async () => {
    let cache: any;
    const acked: any[] = [];
    const failed: any[] = [];

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.on('acked', data => acked.push(data));

    await sm1.enable();
    await sm1.track('sm', { type: 'enable' });

    await sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    await sm1.track('message', { body: 'message 1' });
    await sm1.track('message', { body: 'message 2' });
    await sm1.track('message', { body: 'message 3' });
    await sm1.track('message', { body: 'message 4' });
    await sm1.process({ type: 'ack', handled: 1 });
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.load(cache);

    sm2.on('acked', data => acked.push(data));
    sm2.on('failed', data => failed.push(data));

    await sm2.resume();
    await sm2.failed({ type: 'failed', handled: 2 });

    expect(acked).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 1' } },
        { kind: 'message', stanza: { body: 'message 2' } }
    ]);
    expect(failed).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 3' } },
        { kind: 'message', stanza: { body: 'message 4' } }
    ]);
});

test('Handled failed with unknown handled', async () => {
    let cache: any;
    const acked: any[] = [];
    const failed: any[] = [];

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.on('acked', data => acked.push(data));

    await sm1.enable();
    await sm1.track('sm', { type: 'enable' });

    await sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    await sm1.track('message', { body: 'message 1' });
    await sm1.track('message', { body: 'message 2' });
    await sm1.track('message', { body: 'message 3' });
    await sm1.track('message', { body: 'message 4' });

    sm1.request();
    await sm1.process({ type: 'ack', handled: 1 });
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.load(cache);

    sm2.on('acked', data => acked.push(data));
    sm2.on('failed', data => failed.push(data));

    await sm2.resume();
    await sm2.failed({ type: 'failed' });

    expect(acked).toStrictEqual([{ kind: 'message', stanza: { body: 'message 1' } }]);
    expect(failed).toStrictEqual([
        { kind: 'message', stanza: { body: 'message 2' } },
        { kind: 'message', stanza: { body: 'message 3' } },
        { kind: 'message', stanza: { body: 'message 4' } }
    ]);
});

test('Report previously handled on resume', async () => {
    const handledCount = 2;
    let cache: any;

    const sm1 = new StreamManagement();
    sm1.cache(data => {
        cache = data;
    });

    sm1.bind('test-jid');
    await sm1.enable();
    await sm1.track('sm', { type: 'enable' });

    await sm1.enabled({ id: 'test', resume: true, type: 'enabled' });

    for (let i = 0; i < handledCount; i++) {
        await sm1.handle();
    }
    // -- sm1 disconnect --

    // -- resume with sm2 --
    const sm2 = new StreamManagement();
    sm2.load(cache);

    sm2.on('send', data => { if (data.type === 'resume') { expect(data.handled).toStrictEqual(handledCount); }});

    await sm2.resume();
    await sm2.track('sm', { type: 'resume', previousSession: 'test', handled: 2 })
    await sm2.resumed( { type: 'resumed', previousSession: 'test', handled: 0 });
    expect(sm2.handled).toStrictEqual(handledCount);
});
