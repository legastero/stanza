import expect from 'expect';

import * as JXT from '../../src/jxt';

function setup(): JXT.Registry {
    return new JXT.Registry();
}

test('Export undefined JXT data', () => {
    const registry = setup();

    const exported = registry.export('', undefined!);
    expect(exported).toBe(undefined);
});

test('Export unknown JXT data', () => {
    const registry = setup();

    const exported = registry.export('', { dne: true });
    expect(exported).toBe(undefined);
});

test('Export unknown path', () => {
    const registry = setup();

    const exported = registry.export('does.not.exist', { dne: true });
    expect(exported).toBe(undefined);
});

test('Import unknown XML', () => {
    const registry = setup();
    const xml = JXT.parse('<dne xmlns="urn:example" />');

    const imported = registry.import(xml);
    expect(imported).toBe(undefined);
});

test('Unknown XML importer', () => {
    const registry = setup();
    const xml = JXT.parse('<dne xmlns="urn:example" />');

    const translator = registry.root;
    const imported = translator.import(xml, {});
    expect(imported).toBe(undefined);
});

test('Unknown import key path', () => {
    const registry = setup();
    const xml = JXT.parse('<dne xmlns="urn:example" />');

    const key = registry.getImportKey(xml, 'does.not.exist');
    expect(key).toBe(undefined);
});
