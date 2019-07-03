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
} from '../jxt';

import { NS_CLIENT, NS_STANZAS, NS_STREAM } from '../Namespaces';

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
        ): { [key: string]: string | undefined } {
            const result: { [key: string]: string | undefined } = {};
            const params = findAll(xml, namespace, element);
            const keyImporter = attribute(keyName).importer;
            const valueImporter = attribute(valueName).importer;
            for (const param of params) {
                result[keyImporter(param, context)!] = valueImporter(param, context);
            }
            return result;
        },
        exporter(
            xml: XMLElement,
            values: { [key: string]: string | undefined },
            context: TranslationContext
        ) {
            const keyExporter = attribute(keyName).exporter;
            const valueExporter = attribute(valueName).exporter;
            for (const param of Object.keys(values)) {
                const paramEl = createElement(namespace, element);
                keyExporter(paramEl, param, context);
                if (values[param]) {
                    valueExporter(paramEl, values[param]!, context);
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
