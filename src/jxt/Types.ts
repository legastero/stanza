import { FieldDefinition, JSONData, LanguageSet, TranslationContext } from './Definitions';
import XMLElement, { JSONElement } from './Element';
import { parse } from './Parser';

// ====================================================================
// Utility Functions
// ====================================================================

type ElementPath = Array<{ namespace: string | null; element: string }>;

export function createElement(
    namespace: string | null | undefined,
    name: string,
    parentNamespace?: string,
    parent?: XMLElement
): XMLElement {
    if (parent) {
        namespace = namespace || parent.getNamespace();
        const root = parent.getNamespaceRoot(namespace);
        if (root) {
            const prefix = root.useNamespace('', namespace);
            name = `${prefix}:${name}`;
        }
    }

    const el = new XMLElement(name);

    if (name.indexOf(':') < 0 && (!parentNamespace || namespace !== parentNamespace)) {
        el.setAttribute('xmlns', namespace);
    }

    return el;
}

export function getLang(xml: XMLElement, lang?: string): string {
    return (xml.getAttribute('xml:lang') || lang || '').toLowerCase();
}

export function getTargetLang(children: XMLElement[], context: TranslationContext): string {
    const availableLanguages: string[] = [];
    for (const child of children) {
        availableLanguages.push(getLang(child, context.lang));
    }

    let targetLanguage: string | undefined;
    if (!context.resolveLanguage) {
        targetLanguage = context.lang;
    } else {
        targetLanguage = context.resolveLanguage(
            availableLanguages,
            context.acceptLanguages || [],
            context.lang
        );
    }

    return targetLanguage || '';
}

export function findAll(
    xml: XMLElement,
    namespace: string | null | undefined,
    element: string,
    lang?: string
): XMLElement[] {
    const existing = xml.getChildren(element, namespace);
    const parentLang = getLang(xml);

    if (existing.length) {
        if (lang) {
            return existing.filter(child => {
                const childLang = getLang(child, parentLang);
                if (childLang === lang) {
                    return true;
                }
            });
        } else {
            return existing;
        }
    }

    return [];
}

export function findOrCreate(
    xml: XMLElement,
    namespace: string | null,
    element: string,
    lang?: string
): XMLElement {
    namespace = namespace || xml.getNamespace();

    const existing = findAll(xml, namespace, element, lang);
    if (existing.length) {
        return existing[0];
    }

    const created = createElement(namespace, element, xml.getDefaultNamespace(), xml);
    const parentLang = getLang(xml, lang);
    if (lang && parentLang !== lang) {
        created.setAttribute('xml:lang', lang);
    }
    xml.appendChild(created);
    return created;
}

export interface CreateAttributeOptions<T, E = T> {
    staticDefault?: T;
    dynamicDefault?: (raw?: string) => T | undefined;
    emitEmpty?: boolean;
    name: string;
    namespace?: string | null;
    prefix?: string;
    parseValue(raw: string): T | undefined;
    writeValue(raw: T | E): string;
}
function createAttributeField<T, E = T>(opts: CreateAttributeOptions<T, E>): FieldDefinition<T, E> {
    return {
        importer(xml) {
            const rawValue = xml.getAttribute(opts.name, opts.namespace);
            if (!rawValue) {
                return opts.dynamicDefault ? opts.dynamicDefault(rawValue) : opts.staticDefault;
            }
            return opts.parseValue(rawValue);
        },
        exporter(xml, value) {
            if (value === undefined || value === opts.staticDefault) {
                return;
            }
            const output = opts.writeValue(value);
            if (!output && !opts.emitEmpty) {
                return;
            }
            if (!opts.namespace || !opts.prefix) {
                xml.setAttribute(opts.name, output, opts.emitEmpty);
            } else {
                let prefix;
                const root = xml.getNamespaceRoot(opts.namespace);
                if (root) {
                    prefix = root.useNamespace(opts.prefix, opts.namespace);
                } else {
                    const namespaces = xml.getNamespaceContext();
                    if (!namespaces[opts.namespace]) {
                        prefix = xml.useNamespace(opts.prefix, opts.namespace);
                        namespaces[opts.namespace] = prefix;
                    }
                }
                xml.setAttribute(`${prefix}:${opts.name}`, output, opts.emitEmpty);
            }
        }
    };
}
function createAttributeType<T, E = T>(
    parser: TypeParser<T, E>,
    createOpts?: (
        opts: Partial<CreateAttributeOptions<T, E>>
    ) => Partial<CreateAttributeOptions<T, E>>
) {
    return (
        name: string,
        defaultValue: T | undefined = undefined,
        opts: Partial<CreateAttributeOptions<T, E>> = {}
    ): FieldDefinition<T, E> => {
        opts = { staticDefault: defaultValue, ...opts };
        return createAttributeField<T, E>({
            name,
            ...parser,
            ...(createOpts ? createOpts(opts) : opts)
        });
    };
}
function createNamespacedAttributeType<T, E = T>(
    parser: TypeParser<T, E>,
    createOpts?: (
        opts: Partial<CreateAttributeOptions<T, E>>
    ) => Partial<CreateAttributeOptions<T, E>>
) {
    return (
        prefix: string,
        namespace: string,
        name: string,
        defaultValue: T | undefined = undefined,
        opts: Partial<CreateAttributeOptions<T, E>> = {}
    ): FieldDefinition<T, E> => {
        opts = { staticDefault: defaultValue, ...opts };
        return createAttributeField<T, E>({
            name,
            namespace,
            prefix,
            ...parser,
            ...(createOpts ? createOpts(opts) : opts)
        });
    };
}

export interface CreateChildAttributeOptions<T, E = T> extends CreateAttributeOptions<T, E> {
    element: string;
    attributeNamespace?: string | null;
    converter?: FieldDefinition<T, E>;
}
function createChildAttributeField<T, E = T>(
    opts: CreateChildAttributeOptions<T, E>
): FieldDefinition<T, E> {
    const converter =
        opts.converter ||
        createAttributeField({
            ...opts,
            namespace: opts.attributeNamespace
        });
    return {
        importer(xml, context) {
            const child = xml.getChild(opts.element, opts.namespace || xml.getNamespace());
            if (!child) {
                return opts.dynamicDefault ? opts.dynamicDefault() : opts.staticDefault;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            if (value !== undefined && value !== opts.staticDefault) {
                const child = findOrCreate(xml, opts.namespace || xml.getNamespace(), opts.element);
                converter.exporter(child, value, context);
            }
        }
    };
}
function createChildAttributeType<T, E = T>(
    parser: TypeParser<T, E>,
    createOpts?: (
        opts: Partial<CreateChildAttributeOptions<T, E>>
    ) => Partial<CreateChildAttributeOptions<T, E>>
) {
    return (
        namespace: string | null,
        element: string,
        name: string,
        defaultValue: T | undefined = undefined,
        opts: Partial<CreateChildAttributeOptions<T, E>> = {}
    ): FieldDefinition<T, E> => {
        opts = { staticDefault: defaultValue, ...opts };
        return createChildAttributeField<T, E>({
            element,
            name,
            namespace,
            ...parser,
            ...(createOpts ? createOpts(opts) : opts)
        });
    };
}

export interface CreateTextOptions<T, E = T> {
    emitEmpty?: boolean;
    staticDefault?: T;
    dynamicDefault?: (raw?: string) => T | undefined;
    parseValue(raw: string): T | undefined;
    writeValue(raw: T | E): string;
}
function createTextField<T, E = T>(opts: CreateTextOptions<T, E>): FieldDefinition<T, E> {
    return {
        importer(xml) {
            const rawValue = xml.getText();
            if (!rawValue) {
                return opts.dynamicDefault ? opts.dynamicDefault(rawValue) : opts.staticDefault;
            }
            return opts.parseValue(rawValue);
        },
        exporter(xml, value) {
            if (!value && opts.emitEmpty) {
                xml.children.push('');
                return;
            }
            if (value === undefined || value === opts.staticDefault) {
                return;
            }
            const output = opts.writeValue(value);
            if (output) {
                xml.children.push(output);
            }
        }
    };
}

export interface CreateChildTextOptions<T, E = T> extends CreateTextOptions<T, E> {
    emitEmpty?: boolean;
    matchLanguage?: boolean;
    element: string;
    namespace: string | null;
}
function createChildTextField<T, E = T>(opts: CreateChildTextOptions<T, E>): FieldDefinition<T, E> {
    const converter = createTextField<T, E>(opts);
    return {
        importer(xml, context) {
            const children = findAll(xml, opts.namespace || xml.getNamespace(), opts.element);
            const targetLanguage = getTargetLang(children, context);

            if (!children.length) {
                return opts.dynamicDefault ? opts.dynamicDefault() : opts.staticDefault;
            }

            if (opts.matchLanguage) {
                for (const child of children) {
                    if (getLang(child, context.lang) === targetLanguage) {
                        return converter.importer(child, context);
                    }
                }
            }

            return converter.importer(children[0], context);
        },
        exporter(xml, value, context) {
            if (!value && opts.emitEmpty) {
                findOrCreate(
                    xml,
                    opts.namespace || xml.getNamespace(),
                    opts.element,
                    opts.matchLanguage ? context.lang : undefined
                );
                return;
            }
            if (value !== undefined && value !== opts.staticDefault) {
                const child = findOrCreate(
                    xml,
                    opts.namespace || xml.getNamespace(),
                    opts.element,
                    opts.matchLanguage ? context.lang : undefined
                );
                converter.exporter(child, value, context);
            }
        }
    };
}

// ====================================================================
// Parsers
// ====================================================================

interface TypeParser<T, E = T> {
    parseValue(raw: string): T | undefined;
    writeValue(raw: T | E): string;
}
const stringParser: TypeParser<string> = {
    parseValue: v => v,
    writeValue: v => v
};
const integerParser: TypeParser<number> = {
    parseValue: v => parseInt(v, 10),
    writeValue: v => v.toString()
};
const floatParser: TypeParser<number> = {
    parseValue: v => parseFloat(v),
    writeValue: v => v.toString()
};
const boolParser: TypeParser<boolean> = {
    parseValue: v => {
        if (v === 'true' || v === '1') {
            return true;
        }
        if (v === 'false' || v === '0') {
            return false;
        }
        return;
    },
    writeValue: v => (v ? '1' : '0')
};
const dateParser: TypeParser<Date, string> = {
    parseValue: v => new Date(v),
    writeValue: v => (typeof v === 'string' ? v : v.toISOString())
};
const jsonParser: TypeParser<JSONData> = {
    parseValue: v => JSON.parse(v),
    writeValue: v => JSON.stringify(v)
};
const bufferParser = (encoding: BufferEncoding = 'utf8'): TypeParser<Buffer, string> => ({
    parseValue: v => {
        if (encoding === 'base64' && v === '=') {
            v = '';
        }
        return Buffer.from(v.trim(), encoding);
    },
    writeValue: v => {
        let data: string;
        if (typeof v === 'string') {
            data = Buffer.from(v).toString(encoding);
        } else if (v) {
            data = v.toString(encoding);
        } else {
            data = '';
        }
        if (encoding === 'base64') {
            data = data || '=';
        }
        return data;
    }
});
const tzOffsetParser: TypeParser<number, string> = {
    parseValue: v => {
        let sign = -1;
        if (v.charAt(0) === '-') {
            sign = 1;
            v = v.slice(1);
        }

        const split = v.split(':');
        const hours = parseInt(split[0], 10);
        const minutes = parseInt(split[1], 10);
        return (hours * 60 + minutes) * sign;
    },
    writeValue: v => {
        if (typeof v === 'string') {
            return v;
        } else {
            let formatted = '-';
            if (v < 0) {
                v = -v;
                formatted = '+';
            }
            const hours = v / 60;
            const minutes = v % 60;
            formatted +=
                (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;

            return formatted;
        }
    }
};

// ====================================================================
// Field Types
// ====================================================================

export const attribute = createAttributeType<string>(stringParser, opts => ({
    dynamicDefault: opts.emitEmpty ? v => (v === '' ? '' : opts.staticDefault) : undefined,
    ...opts
}));
export const booleanAttribute = createAttributeType<boolean>(boolParser);
export const integerAttribute = createAttributeType<number>(integerParser);
export const floatAttribute = createAttributeType<number>(floatParser);
export const dateAttribute = createAttributeType<Date, string>(dateParser);
export const namespacedAttribute = createNamespacedAttributeType<string>(stringParser);
export const namespacedBooleanAttribute = createNamespacedAttributeType<boolean>(boolParser);
export const namespacedIntegerAttribute = createNamespacedAttributeType<number>(integerParser);
export const namespacedFloatAttribute = createNamespacedAttributeType<number>(floatParser);
export const namespacedDateAttribute = createNamespacedAttributeType<Date, string>(dateParser);

export const childAttribute = createChildAttributeType<string>(stringParser);
export const childBooleanAttribute = createChildAttributeType<boolean>(boolParser);
export const childIntegerAttribute = createChildAttributeType<number>(integerParser);
export const childFloatAttribute = createChildAttributeType<number>(floatParser);
export const childDateAttribute = createChildAttributeType<Date, string>(dateParser);

export const text = (defaultValue?: string) =>
    createTextField<string>({
        staticDefault: defaultValue,
        ...stringParser
    });
export const textJSON = () => createTextField<JSONData>({ ...jsonParser });
export const textBuffer = (encoding: BufferEncoding = 'utf8') =>
    createTextField<Buffer, string>({
        ...bufferParser(encoding)
    });

export function languageAttribute(): FieldDefinition<string> {
    return {
        importer(xml, context) {
            return getLang(xml, context.lang);
        },
        exporter(xml, value, context) {
            if (value && value.toLowerCase() !== context.lang) {
                xml.setAttribute('xml:lang', value);
            } else {
                xml.setAttribute('xml:lang', undefined);
            }
        }
    };
}

export const childLanguageAttribute = (namespace: string | null, element: string) =>
    createChildAttributeField<string>({
        converter: languageAttribute(),
        element,
        name: 'xml:lang',
        namespace,
        ...stringParser
    });

export const childText = (
    namespace: string | null,
    element: string,
    defaultValue?: string,
    emitEmpty: boolean = false
) =>
    createChildTextField({
        element,
        emitEmpty,
        matchLanguage: true,
        namespace,
        staticDefault: defaultValue,
        ...stringParser
    });

export const childTextBuffer = (
    namespace: string | null,
    element: string,
    encoding: BufferEncoding = 'utf8'
) =>
    createChildTextField({
        element,
        matchLanguage: true,
        namespace,
        ...bufferParser(encoding)
    });

export const childDate = (namespace: string | null, element: string) =>
    createChildTextField({
        element,
        namespace,
        ...dateParser
    });

export const childInteger = (namespace: string | null, element: string, defaultValue?: number) =>
    createChildTextField({
        element,
        namespace,
        staticDefault: defaultValue,
        ...integerParser
    });

export const childFloat = (namespace: string | null, element: string, defaultValue?: number) =>
    createChildTextField({
        element,
        namespace,
        staticDefault: defaultValue,
        ...floatParser
    });

export const childJSON = (namespace: string | null, element: string) =>
    createChildTextField({
        element,
        namespace,
        ...jsonParser
    });

export function childTimezoneOffset(
    namespace: string | null,
    element: string
): FieldDefinition<number, string> {
    return createChildTextField({
        element,
        namespace,
        staticDefault: 0,
        ...tzOffsetParser
    });
}

export function childBoolean(namespace: string | null, element: string): FieldDefinition<boolean> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (child) {
                return true;
            }
        },
        exporter(xml, value) {
            if (value) {
                findOrCreate(xml, namespace || xml.getNamespace(), element);
            }
        }
    };
}

const deepChildExporter = (path: ElementPath, xml: XMLElement, value: any) => {
    if (!value) {
        return;
    }

    let current = xml;
    for (const node of path) {
        current = findOrCreate(current, node.namespace || current.getNamespace(), node.element);
    }
    current.children.push(value.toString());
};

export function deepChildText(path: ElementPath, defaultValue?: string): FieldDefinition<string> {
    return {
        importer(xml) {
            let current: XMLElement | undefined = xml;
            for (const node of path) {
                current = current.getChild(node.element, node.namespace || current.getNamespace());
                if (!current) {
                    return defaultValue;
                }
            }
            return current.getText() || defaultValue;
        },
        exporter(xml, value) {
            deepChildExporter(path, xml, value);
        }
    };
}

export function deepChildInteger(
    path: ElementPath,
    defaultValue?: number
): FieldDefinition<number> {
    return {
        importer(xml) {
            let current: XMLElement | undefined = xml;
            for (const node of path) {
                current = current.getChild(node.element, node.namespace || current.getNamespace());
                if (!current) {
                    return;
                }
            }
            const data = current.getText();
            if (data) {
                return parseInt(data, 10);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            deepChildExporter(path, xml, value);
        }
    };
}

export function deepChildBoolean(path: ElementPath): FieldDefinition<boolean> {
    return {
        importer(xml) {
            let current: XMLElement | undefined = xml;
            for (const node of path) {
                current = current.getChild(node.element, node.namespace || current.getNamespace());
                if (!current) {
                    return false;
                }
            }
            return true;
        },
        exporter(xml, value) {
            if (!value) {
                return;
            }

            let current = xml;
            for (const node of path) {
                current = findOrCreate(
                    current,
                    node.namespace || current.getNamespace(),
                    node.element
                );
            }
        }
    };
}

export function childEnum(
    namespace: string | null,
    elements: Array<string | [string, string]>,
    defaultValue?: string
): FieldDefinition<string> {
    const elementNames: Map<string, string> = new Map();
    const valueNames: Map<string, string> = new Map();
    for (const el of elements) {
        if (typeof el === 'string') {
            elementNames.set(el, el);
            valueNames.set(el, el);
        } else {
            elementNames.set(el[1], el[0]);
            valueNames.set(el[0], el[1]);
        }
    }

    return {
        importer(xml) {
            for (const child of xml.children) {
                if (typeof child === 'string') {
                    continue;
                } else if (
                    child.getNamespace() === (namespace || xml.getNamespace()) &&
                    elementNames.has(child.getName())
                ) {
                    return elementNames.get(child.getName());
                }
            }
            return defaultValue;
        },
        exporter(xml, value) {
            if (valueNames.has(value)) {
                findOrCreate(xml, namespace, valueNames.get(value)!);
            }
        }
    };
}

export function childDoubleEnum(
    namespace: string | null,
    parentElements: string[],
    childElements: string[],
    defaultValue?: [string] | [string, string]
): FieldDefinition<[string] | [string, string]> {
    const parentNames = new Set(parentElements);
    const childNames = new Set(childElements);
    return {
        importer(xml) {
            for (const parent of xml.children) {
                if (typeof parent === 'string') {
                    continue;
                } else if (
                    parent.getNamespace() === (namespace || xml.getNamespace()) &&
                    parentNames.has(parent.getName())
                ) {
                    for (const child of parent.children) {
                        if (typeof child === 'string') {
                            continue;
                        } else if (
                            child.getNamespace() === (namespace || xml.getNamespace()) &&
                            childNames.has(child.getName())
                        ) {
                            return [parent.getName(), child.getName()];
                        }
                    }
                    return [parent.getName()];
                }
            }
            return defaultValue;
        },
        exporter(xml, value) {
            const parent = findOrCreate(xml, namespace, value[0]);
            if (value[1]) {
                findOrCreate(parent, namespace, value[1]);
            }
        }
    };
}

export function multipleChildText(
    namespace: string | null,
    element: string
): FieldDefinition<string[]> {
    return {
        importer(xml, context) {
            const result: string[] = [];
            const children = findAll(xml, namespace || xml.getNamespace(), element);
            const targetLanguage = getTargetLang(children, context);

            for (const child of children) {
                if (getLang(child, context.lang) === targetLanguage) {
                    result.push(child.getText());
                }
            }

            return result;
        },
        exporter(xml, values, context) {
            for (const value of values) {
                const child = createElement(
                    namespace || xml.getNamespace(),
                    element,
                    context.namespace,
                    xml
                );
                child.children.push(value);
                xml.appendChild(child);
            }
        }
    };
}

export function multipleChildAttribute(
    namespace: string | null,
    element: string,
    name: string
): FieldDefinition<string[]> {
    return {
        importer(xml) {
            const result: string[] = [];
            const children = xml.getChildren(element, namespace || xml.getNamespace());
            for (const child of children) {
                const childAttr = child.getAttribute(name);
                if (childAttr !== undefined) {
                    result.push(childAttr);
                }
            }
            return result;
        },
        exporter(xml, values, context) {
            for (const value of values) {
                const child = createElement(
                    namespace || xml.getNamespace(),
                    element,
                    context.namespace,
                    xml
                );
                child.setAttribute(name, value);
                xml.appendChild(child);
            }
        }
    };
}

export function multipleChildIntegerAttribute(
    namespace: string | null,
    element: string,
    name: string
): FieldDefinition<number[]> {
    return {
        importer(xml) {
            const result: number[] = [];
            const children = xml.getChildren(element, namespace || xml.getNamespace());
            for (const child of children) {
                const childAttr = child.getAttribute(name);
                if (childAttr !== undefined) {
                    result.push(parseInt(childAttr, 10));
                }
            }
            return result;
        },
        exporter(xml, values, context) {
            for (const value of values) {
                const child = createElement(
                    namespace || xml.getNamespace(),
                    element,
                    context.namespace,
                    xml
                );
                child.setAttribute(name, value.toString());
                xml.appendChild(child);
            }
        }
    };
}

export function childAlternateLanguageText(
    namespace: string | null,
    element: string
): FieldDefinition<LanguageSet<string>> {
    return {
        importer(xml, context) {
            const results: LanguageSet<string> = [];
            const children = findAll(xml, namespace || xml.getNamespace(), element);
            const seenLanuages = new Set();

            for (const child of children) {
                const langText = child.getText();
                if (langText) {
                    const lang = getLang(child, context.lang);
                    if (seenLanuages.has(lang)) {
                        continue;
                    }
                    results.push({ lang, value: langText });
                    seenLanuages.add(lang);
                }
            }
            return seenLanuages.size > 0 ? results : undefined;
        },
        exporter(xml, values, context) {
            for (const entry of values) {
                const val = entry.value;
                if (val) {
                    const child = createElement(
                        namespace || xml.getNamespace(),
                        element,
                        context.namespace,
                        xml
                    );
                    if (entry.lang !== context.lang) {
                        child.setAttribute('xml:lang', entry.lang);
                    }
                    child.children.push(val);
                    xml.appendChild(child);
                }
            }
        }
    };
}

export function multipleChildAlternateLanguageText(
    namespace: string | null,
    element: string
): FieldDefinition<LanguageSet<string[]>> {
    return {
        importer(xml, context) {
            const results: LanguageSet<string[]> = [];
            const langIndex: Map<string, string[]> = new Map();
            let hasResults = false;
            const children = findAll(xml, namespace || xml.getNamespace(), element);
            for (const child of children) {
                const langText = child.getText();
                if (langText) {
                    const lang = getLang(child, context.lang);
                    let langResults = langIndex.get(lang);
                    if (!langResults) {
                        langResults = [];
                        langIndex.set(lang, langResults);
                        results.push({ lang, value: langResults });
                    }
                    langResults.push(langText);
                    hasResults = true;
                }
            }
            return hasResults ? results : undefined;
        },
        exporter(xml, values, context) {
            for (const entry of values) {
                for (const val of entry.value) {
                    const child = createElement(
                        namespace || xml.getNamespace(),
                        element,
                        context.namespace,
                        xml
                    );
                    if (entry.lang !== context.lang) {
                        child.setAttribute('xml:lang', entry.lang);
                    }
                    child.children.push(val);
                    xml.appendChild(child);
                }
            }
        }
    };
}

export function multipleChildEnum(
    namespace: string | null,
    elements: Array<string | [string, string]>
): FieldDefinition<string[]> {
    const elementNames: Map<string, string> = new Map();
    const valueNames: Map<string, string> = new Map();
    for (const el of elements) {
        if (typeof el === 'string') {
            elementNames.set(el, el);
            valueNames.set(el, el);
        } else {
            elementNames.set(el[1], el[0]);
            valueNames.set(el[0], el[1]);
        }
    }

    return {
        importer(xml) {
            const results: string[] = [];
            for (const child of xml.children) {
                if (typeof child === 'string') {
                    continue;
                } else if (
                    child.getNamespace() === (namespace || xml.getNamespace()) &&
                    elementNames.has(child.getName())
                ) {
                    results.push(elementNames.get(child.getName())!);
                }
            }
            return results;
        },
        exporter(xml, values) {
            for (const value of values) {
                findOrCreate(xml, namespace, valueNames.get(value)!);
            }
        }
    };
}

export function splicePath(
    namespace: string | null,
    element: string,
    path: string,
    multiple: boolean = false
): FieldDefinition<JSONData | JSONData[]> {
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return;
            }

            const results: JSONData[] = [];
            for (const grandChild of child.children) {
                if (typeof grandChild === 'string') {
                    continue;
                }

                if (context.registry!.getImportKey(grandChild) === path) {
                    const imported = context.registry!.import(grandChild);
                    if (imported) {
                        results.push(imported);
                    }
                }
            }

            return multiple ? results : results[0];
        },
        exporter(xml, data, context) {
            let values: JSONData[] = [];
            if (!Array.isArray(data)) {
                values = [data];
            } else {
                values = data;
            }

            const children: XMLElement[] = [];
            for (const value of values) {
                const child = context.registry!.export(path, value, {
                    ...context,
                    namespace: namespace || xml.getNamespace() || undefined
                });
                if (child) {
                    children.push(child);
                }
            }

            if (children.length) {
                const skipChild = findOrCreate(xml, namespace || xml.getNamespace(), element);
                for (const child of children) {
                    skipChild.appendChild(child);
                }
            }
        }
    };
}

export function staticValue<T>(value: T): FieldDefinition<T> {
    return {
        exporter: () => undefined,
        importer: () => value
    };
}

export function childRawElement(
    namespace: string | null,
    element: string,
    sanitizer?: string
): FieldDefinition<JSONElement | string> {
    return {
        importer(xml, context) {
            if (sanitizer && (!context.sanitizers || !context.sanitizers[sanitizer])) {
                return;
            }

            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (child) {
                if (sanitizer) {
                    return context.sanitizers![sanitizer](child.toJSON());
                } else {
                    return child.toJSON();
                }
            }
        },
        exporter(xml, value, context) {
            if (typeof value === 'string') {
                const wrapped = parse(
                    `<${element} xmlns="${namespace || xml.getNamespace()}">${value}</${element}>`
                );
                value = wrapped.toJSON();
            }

            if (sanitizer) {
                if (!context.sanitizers || !context.sanitizers[sanitizer]) {
                    return;
                }
                value = context.sanitizers[sanitizer](value) as JSONElement;
            }

            if (value) {
                xml.appendChild(new XMLElement(value.name, value.attributes, value.children));
            }
        }
    };
}

export function childLanguageRawElement(
    namespace: string | null,
    element: string,
    sanitizer?: string
): FieldDefinition<JSONElement | string> {
    return {
        importer(xml, context) {
            if (sanitizer && (!context.sanitizers || !context.sanitizers[sanitizer])) {
                return;
            }

            const children = findAll(xml, namespace || xml.getNamespace(), element);
            const targetLanguage = getTargetLang(children, context);

            for (const child of children) {
                if (getLang(child, context.lang) === targetLanguage) {
                    if (sanitizer) {
                        return context.sanitizers![sanitizer](child.toJSON());
                    } else {
                        return child.toJSON();
                    }
                }
            }

            if (children[0]) {
                if (sanitizer) {
                    return context.sanitizers![sanitizer](children[0].toJSON());
                } else {
                    return children[0].toJSON();
                }
            }
        },
        exporter(xml, value, context) {
            if (typeof value === 'string') {
                const wrapped = parse(
                    `<${element} xmlns="${namespace || xml.getNamespace()}">${value}</${element}>`
                );
                value = wrapped.toJSON();
            }

            if (value && sanitizer) {
                if (!context.sanitizers || !context.sanitizers[sanitizer]) {
                    return;
                }
                value = context.sanitizers[sanitizer](value) as JSONElement;
            }

            if (!value) {
                return;
            }

            const rawElement = findOrCreate(
                xml,
                namespace || xml.getNamespace(),
                element,
                context.lang
            );
            for (const child of value.children) {
                if (typeof child === 'string') {
                    rawElement.appendChild(child);
                } else if (child) {
                    rawElement.appendChild(
                        new XMLElement(child.name, child.attributes, child.children)
                    );
                }
            }
        }
    };
}

export function childAlternateLanguageRawElement(
    namespace: string | null,
    element: string,
    sanitizer?: string
): FieldDefinition<LanguageSet<JSONElement>, LanguageSet<JSONElement | string>> {
    return {
        importer(xml, context) {
            if (sanitizer && (!context.sanitizers || !context.sanitizers[sanitizer])) {
                return;
            }

            const results: LanguageSet<JSONElement> = [];
            const seenLanuages = new Set();
            const children = findAll(xml, namespace || xml.getNamespace(), element);
            for (const child of children) {
                let result = child.toJSON();
                if (sanitizer) {
                    result = context.sanitizers![sanitizer](result) as JSONElement;
                }
                if (result) {
                    const lang = getLang(child, context.lang);
                    if (seenLanuages.has(lang)) {
                        continue;
                    }
                    results.push({ lang, value: result });
                    seenLanuages.add(lang);
                }
            }

            return seenLanuages.size > 0 ? results : undefined;
        },
        exporter(xml, values, context) {
            for (const entry of values) {
                let value = entry.value;

                if (typeof value === 'string') {
                    const wrapped = parse(
                        `<${element} xmlns="${namespace ||
                            xml.getNamespace()}">${value}</${element}>`
                    );
                    value = wrapped.toJSON();
                }

                if (value && sanitizer) {
                    if (!context.sanitizers || !context.sanitizers[sanitizer]) {
                        continue;
                    }
                    value = context.sanitizers[sanitizer](value) as JSONElement;
                }

                if (value) {
                    const rawElement = createElement(
                        namespace || xml.getNamespace(),
                        element,
                        context.namespace,
                        xml
                    );
                    xml.appendChild(rawElement);

                    if (entry.lang !== context.lang) {
                        rawElement.setAttribute('xml:lang', entry.lang);
                    }

                    for (const child of value.children) {
                        if (typeof child === 'string') {
                            rawElement.appendChild(child);
                        } else {
                            rawElement.appendChild(
                                new XMLElement(child.name, child.attributes, child.children)
                            );
                        }
                    }
                }
            }
        }
    };
}

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
            const ns = namespace || xml.getNamespace();

            for (const [param, value] of Object.entries(values)) {
                const paramEl = createElement(ns, element, context.namespace, xml);
                keyExporter(paramEl, param, context);
                if (values[param]) {
                    valueExporter(paramEl, value!, context);
                }
                xml.appendChild(paramEl);
            }
        }
    };
}
