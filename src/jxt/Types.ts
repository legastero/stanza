import { FieldDefinition, JSONData, LanguageSet, TranslationContext } from './Definitions';
import XMLElement, { JSONElement } from './Element';
import { parse } from './Parser';

export function createElement(
    namespace: string | null | undefined,
    name: string,
    parentNamespace?: string
): XMLElement {
    const el = new XMLElement(name);

    if (!parentNamespace || namespace !== parentNamespace) {
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
    const existing = findAll(xml, namespace, element, lang);
    if (existing.length) {
        return existing[0];
    }

    const created = createElement(namespace, element, xml.getNamespace());
    const parentLang = getLang(xml, lang);
    if (lang && parentLang !== lang) {
        created.setAttribute('xml:lang', lang);
    }
    xml.appendChild(created);
    return created;
}

export function attribute(
    name: string,
    defaultValue?: string,
    emitEmpty?: boolean
): FieldDefinition<string> {
    return {
        importer(xml) {
            const value = xml.getAttribute(name);
            if (value === '' && emitEmpty) {
                return value;
            }
            return value || defaultValue;
        },
        exporter(xml, value) {
            xml.setAttribute(name, value, emitEmpty);
        }
    };
}

export function booleanAttribute(name: string): FieldDefinition<boolean> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name);
            if (data === 'true' || data === '1') {
                return true;
            }
            if (data === 'false' || data === '0') {
                return false;
            }
        },
        exporter(xml, value) {
            xml.setAttribute(name, value ? '1' : '0');
        }
    };
}

export function integerAttribute(name: string, defaultValue?: number): FieldDefinition<number> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name);
            if (data) {
                return parseInt(data, 10);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            if (value !== undefined) {
                xml.setAttribute(name, value.toString());
            }
        }
    };
}

export function floatAttribute(name: string, defaultValue?: number): FieldDefinition<number> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name);
            if (data) {
                return parseFloat(data);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            if (value !== undefined) {
                xml.setAttribute(name, value.toString());
            }
        }
    };
}

export function dateAttribute(
    name: string,
    useCurrentDate: boolean = false
): FieldDefinition<Date, string> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name);
            if (data) {
                return new Date(data);
            } else if (useCurrentDate) {
                return new Date(Date.now());
            }
        },
        exporter(xml, value) {
            let data: string;

            if (typeof value === 'string') {
                data = value;
            } else {
                data = value.toISOString();
            }

            xml.setAttribute(name, data);
        }
    };
}

export function namespacedAttribute(
    prefix: string,
    namespace: string,
    name: string,
    defaultValue?: string
): FieldDefinition<string> {
    return {
        importer(xml) {
            return xml.getAttribute(name, namespace) || defaultValue;
        },
        exporter(xml, value) {
            const namespaces = xml.getNamespaceContext();
            if (value) {
                if (!namespaces[namespace]) {
                    xml.setAttribute(`xmlns:${prefix}`, namespace);
                    namespaces[namespace] = prefix;
                }
                xml.setAttribute(`${namespaces[namespace]}:${name}`, value);
            }
        }
    };
}

export function namespacedBooleanAttribute(
    prefix: string,
    namespace: string,
    name: string
): FieldDefinition<boolean> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name, namespace);
            if (data === 'true' || data === '1') {
                return true;
            }
            if (data === 'false' || data === '0') {
                return false;
            }
        },
        exporter(xml, value) {
            const namespaces = xml.getNamespaceContext();
            if (!namespaces[namespace]) {
                xml.setAttribute(`xmlns:${prefix}`, namespace);
                namespaces[namespace] = prefix;
            }
            xml.setAttribute(`${namespaces[namespace]}:${name}`, value ? '1' : '0');
        }
    };
}

export function namespacedIntegerAttribute(
    prefix: string,
    namespace: string,
    name: string,
    defaultValue?: number
): FieldDefinition<number> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name, namespace);
            if (data) {
                return parseInt(data, 10);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            if (value !== undefined) {
                const namespaces = xml.getNamespaceContext();
                if (!namespaces[namespace]) {
                    xml.setAttribute(`xmlns:${prefix}`, namespace);
                    namespaces[namespace] = prefix;
                }
                xml.setAttribute(`${namespaces[namespace]}:${name}`, value.toString());
            }
        }
    };
}

export function namespacedFloatAttribute(
    prefix: string,
    namespace: string,
    name: string,
    defaultValue?: number
): FieldDefinition<number> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name, namespace);
            if (data) {
                return parseFloat(data);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            if (value !== undefined) {
                const namespaces = xml.getNamespaceContext();
                if (!namespaces[namespace]) {
                    xml.setAttribute(`xmlns:${prefix}`, namespace);
                    namespaces[namespace] = prefix;
                }
                xml.setAttribute(`${namespaces[namespace]}:${name}`, value.toString());
            }
        }
    };
}

export function namespacedDateAttribute(
    prefix: string,
    namespace: string,
    name: string,
    useCurrentDate: boolean = false
): FieldDefinition<Date, string> {
    return {
        importer(xml) {
            const data = xml.getAttribute(name, namespace);
            if (data) {
                return new Date(data);
            } else if (useCurrentDate) {
                return new Date(Date.now());
            }
        },
        exporter(xml, value) {
            let data: string;

            if (typeof value === 'string') {
                data = value;
            } else {
                data = value.toISOString();
            }

            const namespaces = xml.getNamespaceContext();
            if (!namespaces[namespace]) {
                xml.setAttribute(`xmlns:${prefix}`, namespace);
                namespaces[namespace] = prefix;
            }
            xml.setAttribute(`${namespaces[namespace]}:${name}`, data);
        }
    };
}

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

export function text(defaultValue?: string): FieldDefinition<string> {
    return {
        importer(xml) {
            return xml.getText() || defaultValue;
        },
        exporter(xml, value) {
            xml.children.push(value);
        }
    };
}

export function textBuffer(
    encoding: BufferEncoding = 'utf8'
): FieldDefinition<Buffer, string | null> {
    return {
        importer(xml) {
            let data = xml.getText();
            if (encoding === 'base64' && data === '=') {
                data = '';
            }
            return Buffer.from(data.trim(), encoding);
        },
        exporter(xml, value) {
            let data: string;
            if (typeof value === 'string') {
                data = Buffer.from(value).toString(encoding);
            } else if (value) {
                data = value.toString(encoding);
            } else {
                data = '';
            }
            if (encoding === 'base64') {
                data = data || '=';
            }
            xml.children.push(data);
        }
    };
}

export function childAttribute(
    namespace: string | null,
    element: string,
    name: string,
    defaultValue?: string
): FieldDefinition<string> {
    const converter = attribute(name, defaultValue);
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return defaultValue;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            return converter.exporter(child, value, context);
        }
    };
}

export function childBooleanAttribute(
    namespace: string | null,
    element: string,
    name: string
): FieldDefinition<boolean> {
    const converter = booleanAttribute(name);
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            return converter.exporter(child, value, context);
        }
    };
}

export function childIntegerAttribute(
    namespace: string | null,
    element: string,
    name: string,
    defaultValue?: number
): FieldDefinition<number> {
    const converter = integerAttribute(name, defaultValue);
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return defaultValue;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            return converter.exporter(child, value, context);
        }
    };
}

export function childFloatAttribute(
    namespace: string | null,
    element: string,
    name: string,
    defaultValue?: number
): FieldDefinition<number> {
    const converter = floatAttribute(name, defaultValue);
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return defaultValue;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            return converter.exporter(child, value, context);
        }
    };
}

export function childDateAttribute(
    namespace: string | null,
    element: string,
    name: string,
    useCurrentDate: boolean = false
): FieldDefinition<Date, string> {
    const converter = dateAttribute(name, useCurrentDate);
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                if (useCurrentDate) {
                    return new Date(Date.now());
                }
                return undefined;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            return converter.exporter(child, value, context);
        }
    };
}

export function childLanguageAttribute(
    namespace: string | null,
    element: string
): FieldDefinition<string> {
    const converter = languageAttribute();
    return {
        importer(xml, context) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return undefined;
            }
            return converter.importer(child, context);
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            return converter.exporter(child, value, context);
        }
    };
}

export function childText(
    namespace: string | null,
    element: string,
    defaultValue?: string
): FieldDefinition<string> {
    return {
        importer(xml, context) {
            const children = findAll(xml, namespace || xml.getNamespace(), element);
            const targetLanguage = getTargetLang(children, context);

            if (!children.length) {
                return defaultValue;
            }

            for (const child of children) {
                if (getLang(child, context.lang) === targetLanguage) {
                    return child.getText() || defaultValue;
                }
            }

            return children[0].getText() || defaultValue;
        },
        exporter(xml, value, context) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element, context.lang);
            child.children.push(value);
        }
    };
}

export function childTextBuffer(
    namespace: string | null,
    element: string,
    encoding: BufferEncoding = 'utf8'
): FieldDefinition<Buffer, string> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            let data = child ? child.getText().trim() || '' : '';
            if (encoding === 'base64' && data === '=') {
                data = '';
            }
            return Buffer.from(data, encoding);
        },
        exporter(xml, value) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);

            let data: string;
            if (typeof value === 'string') {
                data = Buffer.from(value).toString(encoding);
            } else {
                data = value.toString(encoding);
            }
            if (encoding === 'base64') {
                data = data || '=';
            }
            child.children.push(data);
        }
    };
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

export function deepChildBoolean(
    path: Array<{ namespace: string | null; element: string }>
): FieldDefinition<boolean> {
    return {
        importer(xml) {
            let current = xml;
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

export function deepChildInteger(
    path: Array<{ namespace: string | null; element: string }>,
    defaultValue?: number
): FieldDefinition<number> {
    return {
        importer(xml) {
            let current = xml;
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
            current.children.push(value.toString());
        }
    };
}

export function childDate(
    namespace: string | null,
    element: string,
    useCurrentDate: boolean = false
): FieldDefinition<Date, string> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                if (useCurrentDate) {
                    return new Date(Date.now());
                }
                return undefined;
            }
            const data = child.getText();
            if (data) {
                return new Date(data);
            } else if (useCurrentDate) {
                return new Date(Date.now());
            }
        },
        exporter(xml, value) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            let data: string;

            if (typeof value === 'string') {
                data = value;
            } else {
                data = value.toISOString();
            }

            child.children.push(data);
        }
    };
}

export function childInteger(
    namespace: string | null,
    element: string,
    defaultValue?: number
): FieldDefinition<number> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return defaultValue;
            }
            const data = child.getText();
            if (data) {
                return parseInt(data, 10);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            if (value !== undefined) {
                const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
                child.children.push(value.toString());
            }
        }
    };
}

export function childFloat(
    namespace: string | null,
    element: string,
    defaultValue?: number
): FieldDefinition<number> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return defaultValue;
            }
            const data = child.getText();
            if (data) {
                return parseFloat(data);
            } else if (defaultValue) {
                return defaultValue;
            }
        },
        exporter(xml, value) {
            const child = findOrCreate(xml, namespace || xml.getNamespace(), element);
            child.children.push(value.toString());
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
            findOrCreate(xml, namespace, valueNames.get(value)!);
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
                    xml.getNamespace()
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
        exporter(xml, values) {
            for (const value of values) {
                const child = createElement(
                    namespace || xml.getNamespace(),
                    element,
                    xml.getNamespace()
                );
                child.setAttribute(name, value);
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
                        context.namespace
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
                        context.namespace
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
    multiple?: boolean
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

export function staticValue(value: any): FieldDefinition<any> {
    return {
        importer() {
            return value;
        },
        exporter() {
            return;
        }
    };
}

export function childJSON(namespace: string | null, element: string): FieldDefinition<JSONData> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return;
            }
            return JSON.parse(child.getText());
        },
        exporter(xml, value) {
            const child = findOrCreate(xml, namespace, element);
            child.children.push(JSON.stringify(value));
        }
    };
}

export function childTimezoneOffset(
    namespace: string | null,
    element: string
): FieldDefinition<number, string> {
    return {
        importer(xml) {
            const child = xml.getChild(element, namespace || xml.getNamespace());
            if (!child) {
                return 0;
            }
            let formatted = child.getText();

            let sign = -1;
            if (formatted.charAt(0) === '-') {
                sign = 1;
                formatted = formatted.slice(1);
            }

            const split = formatted.split(':');
            const hours = parseInt(split[1], 10);
            const minutes = parseInt(split[1], 10);
            return (hours * 60 + minutes) * sign;
        },
        exporter(xml, value) {
            let formatted = '-';

            if (typeof value === 'string') {
                formatted = value;
            } else {
                if (value < 0) {
                    value = -value;
                    formatted = '+';
                }
                const hours = value / 60;
                const minutes = value % 60;
                formatted +=
                    (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
            }

            const child = findOrCreate(xml, namespace, element);
            child.children.push(formatted);
        }
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
                        context.namespace
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
