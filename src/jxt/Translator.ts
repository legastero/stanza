import {
    ChildTranslator,
    DefinitionUpdateOptions,
    Exporter,
    FieldName,
    Importer,
    JSONData,
    PathContext,
    TranslationContext,
    Type,
    XName
} from './Definitions';
import XMLElement from './Element';
import { createElement } from './Types';

export default class Translator {
    public placeholder: boolean;
    public typeField: FieldName;
    public typeValues: Map<XName, Type>;
    public typeOrders: Map<Type, number>;
    public defaultType: Type;
    public languageField: FieldName;
    public importers: Map<XName, Importer>;
    public exporters: Map<Type, Exporter>;
    public children: Map<FieldName, ChildTranslator>;
    public childrenIndex: Map<XName, FieldName>;
    public implicitChildren: Set<XName>;
    public contexts: Map<string, PathContext>;
    public parents: Set<Translator> = new Set();

    constructor() {
        this.placeholder = false;
        this.typeField = '';
        this.defaultType = '';
        this.languageField = 'lang';
        this.typeValues = new Map();
        this.typeOrders = new Map();
        this.importers = new Map();
        this.exporters = new Map();
        this.children = new Map();
        this.childrenIndex = new Map();
        this.implicitChildren = new Set();
        this.contexts = new Map();
    }

    public addChild(
        name: FieldName,
        translator: Translator,
        multiple = false,
        selector?: string,
        implicit?: string
    ) {
        const child: ChildTranslator = {
            multiple: multiple || false,
            name,
            selector,
            translator
        };
        const existingChild = this.children.get(name);

        if (!existingChild) {
            child.translator.parents.add(this);
            this.children.set(name, child);
            for (const [xid] of translator.importers) {
                if (!this.implicitChildren.has(xid)) {
                    this.childrenIndex.set(xid, name);
                }
            }
            if (implicit) {
                this.implicitChildren.add(implicit);
            }

            return;
        }

        const existing = existingChild.translator;

        existingChild.multiple = multiple;
        if (selector && existingChild.selector && selector !== existingChild.selector) {
            existingChild.selector = undefined;
        }

        for (const [xid, importer] of translator.importers) {
            existing.updateDefinition({
                contexts: translator.contexts,
                element: importer.element,
                exporterOrdering: new Map(),
                exporters: new Map(),
                importerOrdering: importer.fieldOrders,
                importers: importer.fields,
                namespace: importer.namespace,
                optionalNamespaces: new Map(),
                type: existing.typeValues.get(xid)
            });
            if (!this.implicitChildren.has(xid)) {
                this.childrenIndex.set(xid, name);
            }
        }

        for (const [exportType, exporter] of translator.exporters) {
            existing.updateDefinition({
                contexts: translator.contexts,
                element: exporter.element,
                exporterOrdering: exporter.fieldOrders,
                exporters: exporter.fields,
                importerOrdering: new Map(),
                importers: new Map(),
                namespace: exporter.namespace,
                optionalNamespaces: exporter.optionalNamespaces,
                type: exportType
            });
        }
    }

    public addContext(
        path: string,
        selector: string | undefined,
        field: FieldName | undefined,
        xid: XName,
        value: Type,
        implied: boolean
    ): void {
        if (selector) {
            path = `${path}[${selector}]`;
        }
        let context = this.contexts.get(path);
        if (!context) {
            context = {
                typeField: '',
                typeValues: new Map()
            };
        }
        if (implied) {
            context.impliedType = value;
        }
        context.typeField = field || '';
        context.typeValues.set(xid, value);
        this.contexts.set(path, context);
    }

    public getChild(name: FieldName): Translator | undefined {
        const child = this.children.get(name);
        if (!child) {
            return;
        }
        return child.translator;
    }

    public getImportKey(xml: XMLElement): string | undefined {
        return this.childrenIndex.get(`{${xml.getNamespace()}}${xml.getName()}`);
    }

    public updateDefinition(opts: DefinitionUpdateOptions) {
        const xid = `{${opts.namespace}}${opts.element}`;

        const importer: Importer =
            this.importers.get(xid) ||
            ({
                element: opts.element,
                fieldOrders: new Map(),
                fields: new Map(),
                namespace: opts.namespace
            } as Importer);
        for (const [fieldName, fieldImporter] of opts.importers) {
            importer.fields.set(fieldName, fieldImporter);
        }
        for (const [fieldName, order] of opts.importerOrdering) {
            importer.fieldOrders.set(fieldName, order);
        }
        this.importers.set(xid, importer);

        const exporter =
            this.exporters.get(opts.type || this.defaultType) ||
            ({
                element: opts.element,
                fieldOrders: new Map(),
                fields: new Map(),
                namespace: opts.namespace,
                optionalNamespaces: opts.optionalNamespaces
            } as Exporter);
        for (const [fieldName, fieldExporter] of opts.exporters) {
            exporter.fields.set(fieldName, fieldExporter);
        }
        for (const [name, order] of opts.exporterOrdering) {
            exporter.fieldOrders.set(name, order);
        }
        for (const [prefix, namespace] of opts.optionalNamespaces) {
            exporter.optionalNamespaces.set(prefix, namespace);
        }
        this.exporters.set(opts.type || this.defaultType, exporter);

        for (const [path, newContext] of opts.contexts) {
            const context: PathContext = this.contexts.get(path) || {
                impliedType: undefined,
                typeField: newContext.typeField,
                typeValues: new Map()
            };
            if (!context.typeField) {
                context.typeField = newContext.typeField;
            }
            if (!context.impliedType) {
                context.impliedType = newContext.impliedType;
            }
            for (const [xid2, type] of newContext.typeValues) {
                context.typeValues.set(xid2, type);
            }
            this.contexts.set(path, context);
        }

        if (opts.type) {
            this.typeValues.set(xid, opts.type);
            if (opts.typeOrder) {
                this.typeOrders.set(opts.type, opts.typeOrder);
            }
        } else if (this.typeField && !opts.type) {
            for (const [, imp] of this.importers) {
                for (const [fieldName, fieldImporter] of opts.importers) {
                    imp.fields.set(fieldName, fieldImporter);
                }
                for (const [fieldName, order] of opts.importerOrdering) {
                    imp.fieldOrders.set(fieldName, order);
                }
            }

            for (const [, exp] of this.exporters) {
                for (const [fieldName, fieldExporter] of opts.exporters) {
                    exp.fields.set(fieldName, fieldExporter);
                }
                for (const [fieldName, order] of opts.exporterOrdering) {
                    exp.fieldOrders.set(fieldName, order);
                }
            }
        }
    }

    public replaceWith(replacement: Translator): void {
        for (const [a, b] of this.children) {
            replacement.children.set(a, b);
        }
        for (const [a, b] of this.childrenIndex) {
            replacement.childrenIndex.set(a, b);
        }
        for (const [a, b] of this.contexts) {
            replacement.contexts.set(a, b);
        }
        for (const a of this.implicitChildren) {
            replacement.implicitChildren.add(a);
        }
        for (const parent of this.parents) {
            for (const child of parent.children.values()) {
                if (child.translator === this) {
                    child.translator = replacement;
                }
            }
        }
        this.parents = new Set();
    }

    public import(xml: XMLElement, parentContext: TranslationContext): JSONData | undefined {
        const xid = `{${xml.getNamespace()}}${xml.getName()}`;
        const output: JSONData = {};

        const importer = this.importers.get(xid);
        if (!importer) {
            return;
        }

        const typeValue = this.typeValues.get(xid);

        const path = parentContext.path || '';
        let implied: PathContext | undefined;
        if (parentContext.pathSelector) {
            implied = this.contexts.get(`${path}[${parentContext.pathSelector}]`);
        }
        if (!implied) {
            implied = this.contexts.get(path);
        }
        if (implied) {
            if (!implied.impliedType) {
                const impliedTypeValue = implied.typeValues.get(xid);
                if (impliedTypeValue) {
                    output[implied.typeField] = impliedTypeValue;
                }
            }
        } else if (this.typeField && typeValue && typeValue !== this.defaultType) {
            output[this.typeField] = typeValue;
        }

        const context: TranslationContext = {
            ...parentContext,
            data: output,
            importer,
            lang: (xml.getAttribute('xml:lang') || parentContext.lang || '').toLowerCase(),
            pathSelector: typeValue,
            translator: this
        };

        const importFields = [...importer.fieldOrders.entries()].sort((a, b) =>
            a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0
        );

        const preChildren = importFields.filter(field => field[1] >= 0);
        const postChildren = importFields.filter(field => field[1] < 0);

        for (const [fieldName] of preChildren) {
            const importField = importer.fields.get(fieldName)!;
            context.path = `${parentContext.path}.${fieldName}`;

            const value = importField(xml, context);
            if (value !== null && value !== undefined) {
                output[fieldName] = value;
            }
        }

        for (const child of xml.children) {
            if (typeof child === 'string') {
                continue;
            }

            const childName = `{${child.getNamespace()}}${child.getName()}`;
            const fieldName = this.childrenIndex.get(childName);
            if (!fieldName) {
                continue;
            }

            context.path = `${parentContext.path}.${fieldName}`;

            const { translator, multiple, selector } = this.children.get(fieldName)!;

            if (!selector || selector === typeValue) {
                const childOutput = translator.import(child, context);
                if (childOutput !== undefined) {
                    if (multiple) {
                        if (!output[fieldName]) {
                            output[fieldName] = [];
                        }
                        output[fieldName].push(childOutput);
                    } else if (!output[fieldName]) {
                        output[fieldName] = childOutput;
                    } else {
                        output[fieldName] = translator.resolveCollision(
                            output[fieldName],
                            childOutput
                        );
                    }
                }
            }
        }

        for (const [fieldName] of postChildren) {
            const importField = importer.fields.get(fieldName)!;
            context.path = `${parentContext.path}.${fieldName}`;

            const value = importField(xml, context);
            if (value !== null && value !== undefined) {
                output[fieldName] = value;
            }
        }

        return output;
    }

    public export(data: JSONData, parentContext: TranslationContext): XMLElement | undefined {
        if (!data) {
            return;
        }

        let exportType = this.defaultType;
        const path = parentContext.path || '';
        let implied: PathContext | undefined;
        if (parentContext.pathSelector) {
            implied = this.contexts.get(`${path}[${parentContext.pathSelector}]`);
        }
        if (!implied) {
            implied = this.contexts.get(path);
        }

        if (implied) {
            exportType = implied.impliedType || data[implied.typeField] || this.defaultType;
        } else if (this.typeField) {
            exportType = data[this.typeField] || this.defaultType;
        }

        const exporter = this.exporters.get(exportType);
        if (!exporter) {
            return;
        }

        const output = createElement(
            exporter.namespace,
            exporter.element,
            parentContext.namespace,
            parentContext.element
        );
        if (parentContext.element) {
            output.parent = parentContext.element;
        }

        for (const [prefix, namespace] of exporter.optionalNamespaces) {
            output.addOptionalNamespace(prefix, namespace);
        }

        const context: TranslationContext = {
            ...parentContext,
            data,
            element: output,
            exporter,
            lang: (data[this.languageField] || parentContext.lang || '').toLowerCase(),
            namespace: output.getDefaultNamespace(),
            pathSelector: exportType,
            translator: this
        };

        const langExporter = exporter.fields.get(this.languageField);
        if (langExporter) {
            langExporter(output, data[this.languageField], parentContext);
        }

        const keys = Object.keys(data);
        keys.sort((key1, key2) => {
            const a = exporter.fieldOrders.get(key1) || 100000;
            const b = exporter.fieldOrders.get(key2) || 100000;
            return a - b;
        });
        for (const key of keys) {
            if (key === this.languageField) {
                // We've already processed this field
                continue;
            }

            const value = data[key];
            const fieldExporter = exporter.fields.get(key);

            if (fieldExporter) {
                fieldExporter(output, value, context);
                continue;
            }

            const childTranslator = this.children.get(key);
            if (!childTranslator) {
                continue;
            }

            context.path = `${parentContext.path ? parentContext.path + '.' : ''}${key}`;

            const { translator, multiple, selector } = childTranslator;
            if (!selector || selector === exportType) {
                let items: JSONData[];

                if (multiple) {
                    items = value;
                } else {
                    items = [value];
                }

                for (const item of items) {
                    const childOutput = translator.export(item, context);
                    if (childOutput) {
                        output.appendChild(childOutput);
                    }
                }
            }
        }

        return output;
    }

    private resolveCollision(existingData: JSONData, newData: JSONData): JSONData {
        const existingOrder =
            this.typeOrders.get(existingData[this.typeField] || this.defaultType) || 0;
        const newOrder = this.typeOrders.get(newData[this.typeField] || this.defaultType) || 0;

        return existingOrder <= newOrder ? existingData : newData;
    }
}
