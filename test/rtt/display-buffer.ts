import * as RTT from '../../src/helpers/RTT';
import { sleep } from '../../src/Utils';

test('Start', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        event: 'init'
    });

    display.process({
        event: 'new',
        actions: [{ type: 'insert', text: 'Hello ' }],
        seq: 0
    });

    display.process({
        event: 'edit',
        actions: [{ type: 'insert', text: 'World', position: 6 }],
        seq: 1
    });

    await sleep(100);

    expect(display.text).toBe('Hello World');
});

test('Reset', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        event: 'init'
    });

    display.process({
        event: 'new',
        actions: [{ type: 'insert', text: 'Hello ' }],
        seq: 0
    });

    display.process({
        event: 'reset',
        actions: [{ type: 'insert', text: 'Hello World' }],
        seq: 0
    });

    await sleep(100);

    expect(display.text).toBe('Hello World');
});

test('Add text', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        event: 'new',
        actions: [
            {
                position: 0,
                text: 'Hello, ',
                type: 'insert'
            }
        ],
        seq: 0
    });

    display.process({
        actions: [
            {
                position: 7,
                text: 'my J',
                type: 'insert'
            }
        ],
        seq: 1
    });

    display.process({
        actions: [
            {
                position: 11,
                text: 'uliet!',
                type: 'insert'
            }
        ],
        seq: 2
    });

    await sleep(100);

    expect(display.text).toBe('Hello, my Juliet!');
});

test('Erase text', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        event: 'new',
        actions: [
            {
                position: 0,
                text: 'HLL',
                type: 'insert'
            }
        ],
        seq: 0
    });

    display.process({
        actions: [
            {
                length: 2,
                position: 3,
                type: 'erase'
            }
        ],
        seq: 1
    });

    display.process({
        actions: [
            {
                position: 1,
                text: 'ELLO',
                type: 'insert'
            }
        ],
        seq: 2
    });

    await sleep(100);

    expect(display.text).toBe('HELLO');
});

test('Delete text inside message', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        event: 'new',
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

    await sleep(100);

    expect(display.text).toBe('Hello, this is Alice!');
});

test('Insert text inside message', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
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

    await sleep(100);

    expect(display.text).toBe('Hello Bob, this is Alice!');
});

test('Delete and replace text inside message', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
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

    await sleep(100);

    expect(display.text).toBe('Hello Bob, this is Alice!');
});

test('Add waits', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            },
            {
                duration: 10,
                type: 'wait'
            },
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 0
    });

    await sleep(100);

    expect(display.text).toBe('Some text');
});

test('Ignore waits', async () => {
    const display = new RTT.DisplayBuffer();
    display.ignoreWaits = true;

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            },
            {
                duration: 5000,
                type: 'wait'
            },
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 0
    });

    await sleep(100);

    expect(display.text).toBe('Some text');
});

test('Clamp waits to 700ms max', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            },
            {
                duration: 5000,
                type: 'wait'
            },
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 0
    });

    await sleep(1000);

    expect(display.text).toBe('Some text');
});

test('Catch up time deficit', async () => {
    const display = new RTT.DisplayBuffer();
    (display as any).timeDeficit = -3000;

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            },
            {
                duration: 700,
                type: 'wait'
            },
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 0
    });

    await sleep(100);

    expect(display.text).toBe('Some text');
});

test('Handle invalid action type', async () => {
    const display = new RTT.DisplayBuffer();

    // Break encapsulation for testing
    (display as any).timeDeficit = -3000;

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            },
            {
                type: 'unknown'
            },
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 0
    } as any);

    await sleep(100);

    expect(display.text).toBe('Some text');
});

test('Out of sync sequence numbers', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            }
        ],
        event: 'new',
        seq: 0
    } as any);

    display.process({
        actions: [
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 10
    } as any);

    await sleep(100);

    expect(display.synced).toBeFalsy();
    expect(display.text).toBe('Some text');
});

test('Commit', async () => {
    const display = new RTT.DisplayBuffer();

    display.process({
        actions: [
            {
                position: 0,
                text: 'Some',
                type: 'insert'
            },
            {
                duration: 10,
                type: 'wait'
            },
            {
                position: 4,
                text: ' text',
                type: 'insert'
            }
        ],
        seq: 0
    });
    await sleep(100);

    display.commit();
    expect(display.text).toBe('');

    display.process({
        actions: [
            {
                position: 0,
                text: 'New message',
                type: 'insert'
            }
        ],
        seq: 0
    });

    await sleep(100);
    expect(display.text).toBe('New message');
});
