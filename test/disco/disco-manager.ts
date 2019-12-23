import DiscoManager from '../../src/helpers/DiscoManager';
import { DataForm, DiscoInfoIdentity } from '../../src/protocol';

test('Disco - add identity', () => {
    const disco = new DiscoManager();

    const identity: DiscoInfoIdentity = {
        name: 'test-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    };

    disco.addIdentity(identity);

    const info = disco.getNodeInfo('');
    expect(info.identities).toStrictEqual([identity]);
});

test('Disco - add feature', () => {
    const disco = new DiscoManager();

    const feature = 'test-feature';

    disco.addFeature(feature);

    const info = disco.getNodeInfo('');
    expect(info.features).toStrictEqual([feature]);
});

test('Disco - add extension', () => {
    const disco = new DiscoManager();

    const extension: DataForm = {
        fields: [
            {
                name: 'FORM_TYPE',
                value: 'test-extension'
            },
            {
                name: 'field',
                value: 'data'
            }
        ]
    };

    disco.addExtension(extension);

    const info = disco.getNodeInfo('');
    expect(info.extensions).toStrictEqual([extension]);
});

test('Disco - add node identity', () => {
    const disco = new DiscoManager();

    const identity = {
        name: 'test-node-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    };

    disco.addIdentity(identity, 'test-node');

    const info = disco.getNodeInfo('test-node');
    expect(info.identities).toStrictEqual([identity]);
});

test('Disco - add node feature', () => {
    const disco = new DiscoManager();

    const feature = 'test-feature';

    disco.addFeature(feature, 'test-node');

    const info = disco.getNodeInfo('test-node');
    expect(info.features).toStrictEqual([feature]);
});

test('Disco - add node extension', () => {
    const disco = new DiscoManager();

    const extension: DataForm = {
        fields: [
            {
                name: 'FORM_TYPE',
                value: 'test-extension'
            },
            {
                name: 'field',
                value: 'data'
            }
        ]
    };

    disco.addExtension(extension, 'test-node');

    const info = disco.getNodeInfo('test-node');
    expect(info.extensions).toStrictEqual([extension]);
});

test('Disco - unknown node info', () => {
    const disco = new DiscoManager();
    const info = disco.getNodeInfo('test-node');
    expect(info).toStrictEqual({
        extensions: [],
        features: [],
        identities: []
    });
});

test('Disco - entity caps', () => {
    const disco = new DiscoManager();

    disco.addIdentity({
        name: 'test-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    });
    disco.addFeature('test-feature');
    disco.addExtension({
        fields: [
            {
                name: 'FORM_TYPE',
                value: 'test-extension'
            },
            {
                name: 'field',
                value: 'data'
            }
        ]
    });

    const caps = disco.updateCaps('caps-node');
    expect(caps).toStrictEqual([
        {
            algorithm: 'sha-1',
            node: 'caps-node',
            value: 'XswsGlX0JDs6fqhsOoo0JGECy4Y='
        }
    ]);
});

test('Disco - invalid entity caps', () => {
    const disco = new DiscoManager();

    disco.addIdentity({
        name: 'test-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    });
    disco.addIdentity({
        name: 'test-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    });

    const caps = disco.updateCaps('caps-node');
    expect(caps).toStrictEqual([]);
});

test('Disco - only update entity caps when asked', () => {
    const disco = new DiscoManager();

    disco.addIdentity({
        name: 'test-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    });
    disco.addFeature('test-feature');
    disco.addExtension({
        fields: [
            {
                name: 'FORM_TYPE',
                value: 'test-extension'
            },
            {
                name: 'field',
                value: 'data'
            }
        ]
    });

    const caps = disco.updateCaps('caps-node');

    disco.addFeature('test-feature-2');

    const newCaps = disco.getCaps();

    expect(caps).toStrictEqual(newCaps);
});

test('Disco - entity caps stored as new node', () => {
    const disco = new DiscoManager();

    disco.addIdentity({
        name: 'test-identity',
        category: 'test-category',
        type: 'test-type',
        lang: 'en'
    });
    disco.addFeature('test-feature');
    disco.addExtension({
        fields: [
            {
                name: 'FORM_TYPE',
                value: 'test-extension'
            },
            {
                name: 'field',
                value: 'data'
            }
        ]
    });

    const caps = disco.updateCaps('caps-node', ['sha-1', 'sha-256']);
    expect(caps).toStrictEqual([
        {
            algorithm: 'sha-1',
            node: 'caps-node',
            value: 'XswsGlX0JDs6fqhsOoo0JGECy4Y='
        },
        {
            algorithm: 'sha-256',
            node: 'caps-node',
            value: 'yGnu1EohmyPSJWsEXNafsoBpFKZ52xlptZt0spNlXKw='
        }
    ]);
    for (const info of caps || []) {
        expect(disco.getNodeInfo(`${info.node}#${info.value}`)).toStrictEqual({
            extensions: [
                {
                    fields: [
                        {
                            name: 'FORM_TYPE',
                            value: 'test-extension'
                        },
                        {
                            name: 'field',
                            value: 'data'
                        }
                    ]
                }
            ],
            features: ['test-feature'],
            identities: [
                {
                    name: 'test-identity',
                    category: 'test-category',
                    type: 'test-type',
                    lang: 'en'
                }
            ]
        });
    }
});
