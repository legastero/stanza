import {
    attribute,
    childAttribute,
    childText,
    createElement,
    DefinitionOptions,
    FieldDefinition,
    findAll,
    LinkPath,
    TranslationContext,
    XMLElement
} from '../../jxt';

import { NS_BOSH, NS_CLIENT, NS_COMPONENT, NS_SERVER, NS_STANZAS, NS_STREAM } from '../Namespaces';

export const STREAM_TYPES = [
    [NS_CLIENT, NS_CLIENT], // RFC6120
    [NS_SERVER, NS_SERVER], // RFC6120
    [NS_COMPONENT, NS_COMPONENT], // XEP-0114,
    [NS_BOSH, NS_BOSH] // XEP-0124 (Compatibility)
];

export type JID = string;
export const JIDAttribute = attribute;
export const childJIDAttribute = childAttribute;
export const childJID = childText;

export function parameterMap(
    namespace: string,
    element: string,
    keyName: string,
    valueName: string
): FieldDefinition {
    return {
        importer(
            xml: XMLElement,
            context: TranslationContext
        ): Array<{ key: string; value?: string }> {
            const result: Array<{ key: string; value?: string }> = [];
            const params = findAll(xml, namespace, element);
            const keyImporter = attribute(keyName).importer;
            const valueImporter = attribute(valueName).importer;
            for (const param of params) {
                result.push({
                    key: keyImporter(param, context)!,
                    value: valueImporter(param, context)
                });
            }
            return result;
        },
        exporter(
            xml: XMLElement,
            values: Array<{ key: string; value?: string }>,
            context: TranslationContext
        ) {
            const keyExporter = attribute(keyName).exporter;
            const valueExporter = attribute(valueName).exporter;
            for (const param of values) {
                const paramEl = createElement(namespace, element);
                keyExporter(paramEl, param.key, context);
                if (param.value) {
                    valueExporter(paramEl, param.value, context);
                }
                xml.appendChild(paramEl);
            }
        }
    };
}

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
