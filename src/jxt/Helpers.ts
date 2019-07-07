import { NS_CLIENT, NS_STANZAS, NS_STREAM } from '../Namespaces';

import { DefinitionOptions, FieldDefinition, LinkPath } from './Definitions';
import { attribute, childAttribute, childText } from './Types';

// ====================================================================
// Useful XMPP Aliases
// ====================================================================

export const JIDAttribute = attribute;
export const childJIDAttribute = childAttribute;
export const childJID = childText;

// ====================================================================
// XMPP Definition Shortcuts
// ====================================================================

export function addAlias(
    namespace: string,
    element: string,
    aliases: string | Array<string | LinkPath>
): DefinitionOptions {
    return {
        aliases: Array.isArray(aliases) ? aliases : [aliases],
        element,
        fields: {},
        namespace
    };
}

export function extendMessage(fields: { [key: string]: FieldDefinition }): DefinitionOptions {
    return {
        element: 'message',
        fields,
        namespace: NS_CLIENT
    };
}

export function extendPresence(fields: { [key: string]: FieldDefinition }): DefinitionOptions {
    return {
        element: 'presence',
        fields,
        namespace: NS_CLIENT
    };
}

export function extendIQ(fields: { [key: string]: FieldDefinition }): DefinitionOptions {
    return {
        element: 'iq',
        fields,
        namespace: NS_CLIENT
    };
}

export function extendStreamFeatures(fields: {
    [key: string]: FieldDefinition;
}): DefinitionOptions {
    return {
        element: 'features',
        fields,
        namespace: NS_STREAM
    };
}

export function extendStanzaError(fields: { [key: string]: FieldDefinition }): DefinitionOptions {
    return {
        element: 'error',
        fields,
        namespace: NS_STANZAS,
        path: 'stanzaError'
    };
}

export function pubsubItemContentAliases(impliedType?: string): LinkPath[] {
    return [
        { path: 'pubsubcontent', contextField: 'itemType' },
        { path: 'pubsubitem.content', contextField: 'itemType' },
        { path: 'pubsubeventitem.content', contextField: 'itemType' },
        { path: 'iq.pubsub.publish.items', contextField: 'itemType' }
    ];
}
