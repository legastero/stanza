import expect from 'expect';
import { attribute, Registry } from '../../src/jxt';

function setupRegistry() {
    const registry = new Registry();

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
        defaultType: 'query',
        element: 'query',
        fields: {
            queryId: attribute('queryid')
        },
        namespace: 'urn:xmpp:mam:1',
        path: 'iq.archive',
        type: 'query',
        typeField: 'type',
        version: '1',
        versionField: 'version',
        defaultVersion: '2'
    });

    registry.define({
        defaultType: 'query',
        element: 'query',
        fields: {
            queryId: attribute('queryid')
        },
        namespace: 'urn:xmpp:mam:2',
        path: 'iq.archive',
        type: 'query',
        typeField: 'type',
        version: '2',
        versionField: 'version'
    });

    registry.define([
        {
            element: 'fin',
            fields: {},
            namespace: 'urn:xmpp:mam:1',
            path: 'iq.archive',
            type: 'result',
            version: '1',
            defaultVersion: '2'
        },
        {
            element: 'fin',
            fields: {},
            namespace: 'urn:xmpp:mam:2',
            path: 'iq.archive',
            type: 'result',
            version: '2',
            defaultVersion: '2'
        }
    ]);

    return registry;
}

test('[Versioned] Export version 1', () => {
    const registry = setupRegistry();

    const data = {
        id: 'q-v-1',
        archive: {
            type: 'result',
            version: '1'
        }
    };

    const output = registry.export('iq', data);
    const input = registry.import(output!);

    expect(data).toEqual(input);
});

test('[Versioned] Export version 2', () => {
    const registry = setupRegistry();

    const data = {
        id: 'q-v-default',
        archive: {
            type: 'result'
        }
    };

    const output = registry.export('iq', data);
    const input = registry.import(output!);

    expect(data).toEqual(input);
});
