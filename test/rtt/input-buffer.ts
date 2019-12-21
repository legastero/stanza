import * as RTT from '../../src/helpers/RTT';
import { sleep } from '../../src/Utils';

test('Start', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    expect(input.start()).toStrictEqual({
        event: 'init'
    });
});

test('Cancel', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    expect(input.stop()).toStrictEqual({
        event: 'cancel'
    });
});

test('Add text', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    input.update('Hello, ');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                text: 'Hello, ',
                type: 'insert'
            }
        ],
        seq: 0
    });

    input.update('Hello, my J');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 7,
                text: 'my J',
                type: 'insert'
            }
        ],
        seq: 1
    });

    input.update('Hello, my Juliet!');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 11,
                text: 'uliet!',
                type: 'insert'
            }
        ],
        seq: 2
    });
});

test('Erase text', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    input.update('HLL');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                text: 'HLL',
                type: 'insert'
            }
        ],
        seq: 0
    });

    input.update('H');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                length: 2,
                position: 3,
                type: 'erase'
            }
        ],
        seq: 1
    });

    input.update('HELLO');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 1,
                text: 'ELLO',
                type: 'insert'
            }
        ],
        seq: 2
    });
});

test('Delete text inside message', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    input.update('Hello Bob, this is Alice!');
    input.update('Hello, this is Alice!');

    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                text: 'Hello Bob, this is Alice!',
                type: 'insert'
            },
            {
                length: 4,
                position: 9,
                type: 'erase'
            }
        ],
        seq: 0
    });
});

test('Insert text inside message', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    input.update('Hello, this is Alice!');
    input.update('Hello Bob, this is Alice!');

    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                text: 'Hello, this is Alice!',
                type: 'insert'
            },
            {
                position: 5,
                text: ' Bob',
                type: 'insert'
            }
        ],
        seq: 0
    });
});

test('Delete and replace text inside message', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    input.update('Hello Bob, tihsd is Alice!');
    input.update('Hello Bob, this is Alice!');

    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                text: 'Hello Bob, tihsd is Alice!',
                type: 'insert'
            },
            {
                length: 4,
                position: 16,
                type: 'erase'
            },
            {
                position: 12,
                text: 'his',
                type: 'insert'
            }
        ],
        seq: 0
    });
});

test('No changes', () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;

    input.update('Some text');
    input.diff();

    expect(input.diff()).toBeNull();
});

test('Reset', async () => {
    const input = new RTT.InputBuffer();
    input.ignoreWaits = true;
    input.start(1000);

    const seq = input.sequenceNumber;

    input.update('Some text');
    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                type: 'insert',
                text: 'Some text'
            }
        ],
        event: 'new',
        seq
    });

    await sleep(2000);

    input.update('Changed during reset internal');

    expect(input.diff()).toStrictEqual({
        actions: [
            {
                position: 0,
                type: 'insert',
                text: 'Changed during reset internal'
            }
        ],
        event: 'reset',
        seq: seq + 1
    });
});

test('Add waits', async () => {
    const input = new RTT.InputBuffer();
    input.start();

    input.update('Some');
    await sleep(10);
    input.update('Some text');

    const event = input.diff()!;
    const actions = event.actions || [];

    expect(actions.length).toBe(3);
    expect(actions[0]).toStrictEqual({
        position: 0,
        type: 'insert',
        text: 'Some'
    });
    expect(actions[1].type).toBe('wait');
    expect(actions[2]).toStrictEqual({
        position: 4,
        type: 'insert',
        text: ' text'
    });
});
