import * as fs from 'fs';

import { DiscoInfo, DiscoInfoIdentity, DataForm } from '../../src/protocol';
import * as EntityCaps from '../../src/helpers/LegacyEntityCapabilities';

test('Generate', () => {
    const info: DiscoInfo = {
        features: [
            'http://jabber.org/protocol/chatstates',
            'urn:xmpp:sec-label:0',
            'urn:xmpp:message-correct:0',
            'urn:xmpp:jingle:1',
            'urn:xmpp:jingle:apps:file-transfer:4',
            'urn:xmpp:jingle:transports:ibb:1',
            'urn:xmpp:jingle:transports:s5b:1',
            'urn:xmpp:receipts'
        ],
        identities: [{ category: 'client', lang: '', name: 'Swift', type: 'pc' }],
        type: 'info'
    };

    const version = EntityCaps.generate(info, 'sha-1');
    expect(version).toBe('3ScHZH4hKmksks0e7RG8B4cjaT8=');
});

test('Verify', () => {
    const info: DiscoInfo = {
        features: [
            'http://jabber.org/protocol/chatstates',
            'urn:xmpp:sec-label:0',
            'urn:xmpp:message-correct:0',
            'urn:xmpp:jingle:1',
            'urn:xmpp:jingle:apps:file-transfer:4',
            'urn:xmpp:jingle:transports:ibb:1',
            'urn:xmpp:jingle:transports:s5b:1',
            'urn:xmpp:receipts'
        ],
        identities: [{ category: 'client', lang: '', name: 'Swift', type: 'pc' }],
        type: 'info'
    };

    const version = EntityCaps.generate(info, 'sha-1')!;

    expect(EntityCaps.verify(info, 'sha-1', version)).toBe(true);
});

test('Fail if repeated features', () => {
    expect(
        EntityCaps.generate(
            {
                features: ['test-1', 'test-1', 'test-2'],
                type: 'info'
            },
            'sha-1'
        )
    ).toBeNull();
});

test('Fail if repeated identities', () => {
    expect(
        EntityCaps.generate(
            {
                identities: [
                    { category: 'client', type: 'web' },
                    { category: 'client', type: 'web' }
                ],
                type: 'info'
            },
            'sha-1'
        )
    ).toBeNull();
});

test('Fail if repeated forms with same FORM_TYPE', () => {
    expect(
        EntityCaps.generate(
            {
                extensions: [
                    { fields: [{ name: 'FORM_TYPE', type: 'hidden', value: 'test-form' }] },
                    { fields: [{ name: 'FORM_TYPE', type: 'hidden', value: 'test-form' }] }
                ],
                type: 'info'
            },
            'sha-1'
        )
    ).toBeNull();
});

test('Ignore forms with no FORM_TYPE', () => {
    expect(
        EntityCaps.generate(
            {
                extensions: [
                    {
                        fields: [{ name: 'test', value: 'test-form-value' }]
                    }
                ],
                features: [
                    'http://jabber.org/protocol/chatstates',
                    'urn:xmpp:sec-label:0',
                    'urn:xmpp:message-correct:0',
                    'urn:xmpp:jingle:1',
                    'urn:xmpp:jingle:apps:file-transfer:4',
                    'urn:xmpp:jingle:transports:ibb:1',
                    'urn:xmpp:jingle:transports:s5b:1',
                    'urn:xmpp:receipts'
                ],
                identities: [{ category: 'client', lang: '', name: 'Swift', type: 'pc' }],
                type: 'info'
            },
            'sha-1'
        )
    ).toBe('3ScHZH4hKmksks0e7RG8B4cjaT8=');
});

test('Ignore forms with FORM_TYPE not hidden', () => {
    expect(
        EntityCaps.generate(
            {
                extensions: [
                    {
                        fields: [
                            { name: 'FORM_TYPE', value: 'test-form' },
                            { name: 'test', value: 'test-form-value' }
                        ]
                    }
                ],
                features: [
                    'http://jabber.org/protocol/chatstates',
                    'urn:xmpp:sec-label:0',
                    'urn:xmpp:message-correct:0',
                    'urn:xmpp:jingle:1',
                    'urn:xmpp:jingle:apps:file-transfer:4',
                    'urn:xmpp:jingle:transports:ibb:1',
                    'urn:xmpp:jingle:transports:s5b:1',
                    'urn:xmpp:receipts'
                ],
                identities: [{ category: 'client', lang: '', name: 'Swift', type: 'pc' }],
                type: 'info'
            },
            'sha-1'
        )
    ).toBe('3ScHZH4hKmksks0e7RG8B4cjaT8=');
});

test('Multiple forms', () => {
    expect(
        EntityCaps.generate(
            {
                extensions: [
                    {
                        fields: [
                            { name: 'FORM_TYPE', type: 'hidden', value: 'form-1' },
                            { name: 'test', value: 'test-form-value' }
                        ]
                    },
                    {
                        fields: [
                            { name: 'FORM_TYPE', type: 'hidden', value: 'form-2' },
                            { name: 'test', value: 'test-form-value' }
                        ]
                    }
                ],
                type: 'info'
            },
            'sha-1'
        )
    ).toBe('qgQ1tPxO/i70NrIvQ0yZkTuSGFM=');
});

test('Form field types', () => {
    expect(
        EntityCaps.generate(
            {
                extensions: [
                    {
                        fields: [
                            { name: 'FORM_TYPE', type: 'hidden', value: 'form-1' },
                            { name: 'test', value: 'test-form-value' },
                            { name: 'test-list', value: ['value-1', 'value-2'] },
                            { name: 'test-true', value: true },
                            { name: 'test-false', value: false },
                            { name: 'test-no-value' }
                        ]
                    }
                ],
                type: 'info'
            },
            'sha-1'
        )
    ).toBe('1cfWKX2s2PqoYWQ9OLiL3LMijag=');
});

// ====================================================================
// Test against a known collection of entity caps
// ====================================================================

interface CapsDbEntry {
    features: string[];
    identities: DiscoInfoIdentity[];
    hash: string;
    node: string;
    forms: {
        [formType: string]: {
            [fieldName: string]: string[];
        };
    };
}
interface CapsDb {
    [version: string]: CapsDbEntry;
}

const capsdb: CapsDb = JSON.parse(
    fs.readFileSync(__dirname + '/legacy-caps-db.json').toString('utf8')
);
for (const [version, dbinfo] of Object.entries(capsdb)) {
    test('CapsDB - ' + version, () => {
        const info: DiscoInfo = {
            extensions: [],
            features: dbinfo.features,
            identities: dbinfo.identities,
            type: 'info'
        };

        for (const [formType, formFields] of Object.entries(dbinfo.forms)) {
            const form: DataForm = {
                fields: [
                    { name: 'FORM_TYPE', type: 'hidden', value: formType, rawValues: [formType] }
                ]
            };
            for (const [fieldName, fieldValue] of Object.entries(formFields)) {
                form.fields!.push({
                    name: fieldName,
                    value: fieldValue[0],
                    rawValues: fieldValue
                });
            }
            info.extensions!.push(form);
        }

        const generated = EntityCaps.generate(info, dbinfo.hash);

        // NOTE: The caps db includes entries with generated version strings that should
        //       have failed generation from duplicated feature names.
        const uniqueFeatures = new Set(dbinfo.features);
        if (uniqueFeatures.size === dbinfo.features.length) {
            expect(generated).toBe(version);
        } else {
            expect(generated).toBeNull();
        }
    });
}
