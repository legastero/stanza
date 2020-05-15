import XMLElement, { JSONElement } from './Element';
import JXTError from './Error';
import Registry from './Registry';
import Translator from './Translator';

export type Plugin = (registry: Registry) => void;

export interface JSONData {
    [key: string]: any;
}

export type FieldName = string;
export type XName = string;
export type Type = string;
export type Version = string;
export type VersionType = string;
export type FieldImporter<T = any> = (
    xml: XMLElement,
    context: TranslationContext
) => T | undefined;
export type FieldExporter<T = any> = (
    xml: XMLElement,
    data: T,
    context: TranslationContext
) => void;
export type LanguageResolver = (
    availableLanguages: string[],
    acceptLanguages: string[],
    currentLanguage?: string
) => string;

export interface FieldDefinition<T = any, E = T> {
    order?: number;
    importOrder?: number;
    exportOrder?: number;
    importer: FieldImporter<T>;
    exporter: FieldExporter<T | E>;
}

export interface Importer {
    namespace: string;
    element: string;
    fields: Map<FieldName, FieldImporter>;
    fieldOrders: Map<FieldName, number>;
}

export interface Exporter {
    namespace: string;
    element: string;
    fields: Map<FieldName, FieldExporter>;
    fieldOrders: Map<FieldName, number>;
    optionalNamespaces: Map<string, string>;
}

export interface ChildTranslator {
    name: FieldName;
    translator: Translator;
    multiple: boolean;
    selector?: string;
}

export interface DefinitionUpdateOptions {
    namespace: string;
    element: string;
    type?: string;
    version?: string;
    importerOrdering: Map<FieldName, number>;
    importers: Map<FieldName, FieldImporter>;
    exporterOrdering: Map<FieldName, number>;
    exporters: Map<FieldName, FieldExporter>;
    contexts: Map<string, PathContext>;
    optionalNamespaces: Map<string, string>;
    typeOrder?: number;
}

export interface DefinitionOptions {
    namespace: string;
    element: string;
    typeField?: string;
    languageField?: string;
    type?: string;
    defaultType?: string;
    version?: string;
    defaultVersion?: string;
    versionField?: string;
    fields?: { [key: string]: FieldDefinition };
    path?: string;
    aliases?: Array<string | LinkPath>;
    childrenExportOrder?: { [key: string]: number };
    optionalNamespaces?: { [prefix: string]: string };
    typeOrder?: number;
}

export interface LinkPath {
    path: string;
    multiple?: boolean;
    selector?: string;
    contextField?: FieldName;
    impliedType?: boolean;
}

export interface LinkOptions {
    namespace: string;
    element: string;
    path: string | string[];
    multiple?: boolean;
    selector?: string;
}

export interface PathContext {
    impliedType?: Type;
    typeField: FieldName;
    typeValues: Map<XName, VersionType>;
    versionField: FieldName;
}

export interface TranslationContext {
    acceptLanguages?: string[];
    resolveLanguage?: LanguageResolver;
    lang?: string;
    namespace?: string;
    data?: JSONData;
    element?: XMLElement;
    translator?: Translator;
    importer?: Importer;
    exporter?: Exporter;
    registry?: Registry;
    path?: string;
    pathSelector?: string;
    sanitizers?: {
        [key: string]: (input: JSONElement | string) => JSONElement | string | undefined;
    };
}

export interface LanguageValue<T> {
    lang: string;
    value: T;
}
export type LanguageSet<T> = Array<LanguageValue<T>>;

const ESCAPE_XML_CHAR: { [key: string]: string } = {
    '"': '&quot;',
    '&': '&amp;',
    "'": '&apos;',
    '<': '&lt;',
    '>': '&gt;'
};

const UNESCAPE_XML_CHAR: { [key: string]: string } = {
    '&amp;': '&',
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"'
};

const ESCAPE_SEQUENCE = /&([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g;
const NEED_ESCAPING = /&|<|>|"|'/g;
const NEED_ESCAPING_TEXT = /&|<|>/g;

function escapeXMLReplaceChar(match: string) {
    return ESCAPE_XML_CHAR[match];
}

function unescapeXMLReplaceChar(match: string) {
    if (UNESCAPE_XML_CHAR[match]) {
        return UNESCAPE_XML_CHAR[match];
    }

    const hex = match.startsWith('&#x');
    const code = parseInt(match.substring(hex ? 3 : 2, match.length - 1), hex ? 16 : 10);

    if (
        code === 0x9 ||
        code === 0xa ||
        code === 0xd ||
        (0x20 <= code && code <= 0xd7ff) ||
        (0xe000 <= code && code <= 0xfffd) ||
        (0x10000 <= code && code <= 0x10ffff)
    ) {
        return String.fromCodePoint(code);
    }

    throw JXTError.restrictedXML('Prohibited entity: ' + match);
}

export function escapeXML(text: string) {
    return text.replace(NEED_ESCAPING, escapeXMLReplaceChar);
}

export function unescapeXML(text: string) {
    return text.replace(ESCAPE_SEQUENCE, match => {
        return unescapeXMLReplaceChar(match);
    });
}

export function escapeXMLText(text: string) {
    return text.replace(NEED_ESCAPING_TEXT, escapeXMLReplaceChar);
}

export function basicLanguageResolver(
    available: string[],
    accept: string[] = [],
    current = ''
): string {
    const avail = new Set(available.map(a => a.toLowerCase()));
    for (let acceptLang of accept.map(a => a.toLowerCase())) {
        if (acceptLang === '*') {
            continue;
        }
        while (acceptLang.length > 0) {
            if (avail.has(acceptLang)) {
                return acceptLang;
            }
            // Remove ending tag
            acceptLang = acceptLang.substring(0, acceptLang.lastIndexOf('-')).toLowerCase();
            // Remove leftover single character tag
            if (acceptLang.lastIndexOf('-') === acceptLang.length - 2) {
                acceptLang = acceptLang.substring(0, acceptLang.lastIndexOf('-'));
            }
        }
    }
    return current;
}
