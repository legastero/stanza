import expect from 'expect';
import { attribute, childAttribute, childText, Registry } from '../../src/jxt';

function setupRegistry(): Registry {
    const registry = new Registry();

    registry.define({
        element: 'message',
        fields: {
            body: childText(null, 'body'),
            id: attribute('id'),
            type: attribute('type')
        },
        namespace: 'jabber:client',
        path: 'message'
    });

    registry.define({
        element: 'iq',
        fields: {
            id: attribute('id'),
            type: attribute('type')
        },
        namespace: 'jabber:client',
        path: 'iq'
    });

    registry.define({
        aliases: ['pubsub'],
        defaultType: 'user',
        element: 'pubsub',
        namespace: 'http://jabber.org/protocol/pubsub',
        path: 'iq.pubsub',
        type: 'user',
        typeField: 'mode'
    });

    registry.define({
        aliases: ['pubsub'],
        element: 'pubsub',
        namespace: 'http://jabber.org/protocol/pubsub#owner',
        path: 'iq.pubsub',
        type: 'owner',
        typeField: 'mode'
    });

    registry.define({
        aliases: [{ path: 'iq.pubsub.configure', selector: 'user', impliedType: true }],
        element: 'configure',
        fields: {
            node: attribute('node')
        },
        namespace: 'http://jabber.org/protocol/pubsub',
        type: 'http://jabber.org/protocol/pubsub'
    });

    registry.define({
        aliases: [{ path: 'iq.pubsub.configure', selector: 'owner', impliedType: true }],
        element: 'configure',
        fields: {
            node: attribute('node')
        },
        namespace: 'http://jabber.org/protocol/pubsub#owner',
        type: 'http://jabber.org/protocol/pubsub#owner'
    });

    registry.define({
        element: 'publish',
        fields: {
            id: childAttribute(null, 'item', 'id'),
            node: attribute('node')
        },
        namespace: 'http://jabber.org/protocol/pubsub',
        path: 'iq.pubsub.publish'
    });

    registry.define({
        aliases: [
            { path: 'pubsubitem', contextField: 'itemType' },
            { path: 'tune', impliedType: true },
            { path: 'message.tune', impliedType: true },
            { path: 'iq.pubsub.publish.content', contextField: 'itemType' }
        ],
        element: 'tune',
        fields: {
            artist: childText(null, 'artist'),
            title: childText(null, 'title')
        },
        namespace: 'http://jabber.org/protocol/tune',
        type: 'http://jabber.org/protocol/tune'
    });

    registry.define({
        aliases: [
            { path: 'pubsubitem', contextField: 'itemType' },
            { path: 'geoloc', impliedType: true },
            { path: 'message.geoloc', impliedType: true },
            { path: 'iq.pubsub.publish.content', contextField: 'itemType' }
        ],
        element: 'geoloc',
        fields: {
            country: childText(null, 'country')
        },
        namespace: 'http://jabber.org/protocol/geoloc',
        type: 'http://jabber.org/protocol/geoloc'
    });

    return registry;
}

test('[Contexts] Export Pubsub Tune', () => {
    const registry = setupRegistry();

    const data = {
        pubsub: {
            publish: {
                content: {
                    artist: 'Yes!',
                    itemType: 'http://jabber.org/protocol/tune',
                    title: 'Homeworld'
                },
                id: 'current',
                node: 'http://jabber.org/protocol/tune'
            }
        }
    };

    const output = registry.export('iq', data);
    const input = registry.import(output!);

    expect(data).toEqual(input);
});

test('[Contexts] Export Pubsub Geoloc', () => {
    const registry = setupRegistry();

    const data = {
        pubsub: {
            publish: {
                content: {
                    country: 'United States',
                    itemType: 'http://jabber.org/protocol/geoloc'
                },
                id: 'current',
                node: 'http://jabber.org/protocol/geoloc'
            }
        }
    };

    const output = registry.export('iq', data);
    const input = registry.import(output!);

    expect(data).toEqual(input);
});

test('[Contexts] Export Message Tune', () => {
    const registry = setupRegistry();

    const data = {
        tune: {
            artist: 'Yes!',
            title: 'Homeworld'
        }
    };

    const output = registry.export('message', data);
    const input = registry.import(output!);

    expect(data).toEqual(input);
});

test('[Contexts] Export Message Geoloc', () => {
    const registry = setupRegistry();

    const data = {
        geoloc: {
            country: 'United States'
        }
    };

    const output = registry.export('message', data);
    const input = registry.import(output!);

    expect(data).toEqual(input);
});

test('[Contexts] Implicit types + selector', () => {
    const registry = setupRegistry();

    const output = registry.export('iq', {
        pubsub: {
            configure: {
                node: 'owner'
            },
            mode: 'owner'
        }
    });
    expect(output!.toString()).toBe(
        '<iq xmlns="jabber:client"><pubsub xmlns="http://jabber.org/protocol/pubsub#owner"><configure node="owner"/></pubsub></iq>'
    );
    expect(registry.import(output!)).toEqual({
        pubsub: {
            configure: {
                node: 'owner'
            },
            mode: 'owner'
        }
    });

    const output2 = registry.export('iq', {
        pubsub: {
            configure: {
                node: 'user'
            },
            mode: 'user'
        }
    });

    expect(output2!.toString()).toBe(
        '<iq xmlns="jabber:client"><pubsub xmlns="http://jabber.org/protocol/pubsub"><configure node="user"/></pubsub></iq>'
    );
    expect(registry.import(output2!)).toEqual({
        pubsub: {
            configure: {
                node: 'user'
            }
        }
    });
});
