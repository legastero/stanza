import test from 'tape';
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

export default function runTests() {
    test('[Contexts] Export Pubsub Tune', t => {
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

        t.deepEqual(data, input, 'Pubsub tune data equivalent');
        t.end();
    });

    test('[Contexts] Export Pubsub Geoloc', t => {
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

        t.deepEqual(data, input, 'Pubsub geoloc data equivalent');
        t.end();
    });

    test('[Contexts] Export Message Tune', t => {
        const registry = setupRegistry();

        const data = {
            tune: {
                artist: 'Yes!',
                title: 'Homeworld'
            }
        };

        const output = registry.export('message', data);
        const input = registry.import(output!);

        t.deepEqual(data, input, 'Message tune data equivalent');
        t.end();
    });

    test('[Contexts] Export Message Geoloc', t => {
        const registry = setupRegistry();

        const data = {
            geoloc: {
                country: 'United States'
            }
        };

        const output = registry.export('message', data);
        const input = registry.import(output!);

        t.deepEqual(data, input, 'Message geoloc data equivalent');
        t.end();
    });

    test('[Contexts] Implicit types + selector', t => {
        const registry = setupRegistry();

        const output = registry.export('iq', {
            pubsub: {
                configure: {
                    node: 'owner'
                },
                mode: 'owner'
            }
        });
        t.equal(
            output!.toString(),
            '<iq xmlns="jabber:client"><pubsub xmlns="http://jabber.org/protocol/pubsub#owner"><configure node="owner"/></pubsub></iq>',
            'Export owner version'
        );
        t.deepEqual(registry.import(output!), {
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

        t.equal(
            output2!.toString(),
            '<iq xmlns="jabber:client"><pubsub xmlns="http://jabber.org/protocol/pubsub"><configure node="user"/></pubsub></iq>',
            'Export user version'
        );
        t.deepEqual(registry.import(output2!), {
            pubsub: {
                configure: {
                    node: 'user'
                }
            }
        });

        t.end();
    });
}
