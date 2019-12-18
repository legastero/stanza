import {
    basicLanguageResolver,
    DefinitionOptions,
    FieldDefinition,
    FieldExporter,
    FieldImporter,
    JSONData,
    LanguageResolver,
    Plugin,
    TranslationContext,
    XName
} from './Definitions';
import XMLElement from './Element';
import sanitizeXHTMLIM from './sanitizers/XHTMLIM';
import Translator from './Translator';

export default class Registry {
    public root: Translator;
    public translators: Map<XName, Translator>;
    private languageResolver!: LanguageResolver;

    constructor() {
        this.translators = new Map();
        this.root = new Translator();
        this.setLanguageResolver(basicLanguageResolver);
    }

    public setLanguageResolver(resolver: LanguageResolver): void {
        this.languageResolver = resolver;
    }

    public import(
        xml: XMLElement,
        context: TranslationContext = { registry: this }
    ): JSONData | undefined {
        if (!this.hasTranslator(xml.getNamespace(), xml.getName())) {
            return;
        }

        if (!context.acceptLanguages) {
            context.acceptLanguages = [];
        }
        context.acceptLanguages = context.acceptLanguages.map(lang => lang.toLowerCase());

        if (context.lang) {
            context.lang = context.lang.toLowerCase();
        }
        if (!context.resolveLanguage) {
            context.resolveLanguage = this.languageResolver;
        }

        context.path = this.getImportKey(xml);
        if (!context.sanitizers) {
            context.sanitizers = {
                xhtmlim: sanitizeXHTMLIM
            };
        }

        const translator = this.getOrCreateTranslator(xml.getNamespace(), xml.getName());
        return translator.import(xml, {
            ...context,
            registry: this
        });
    }

    public export<T extends JSONData = JSONData>(
        path: string,
        data: T,
        context: TranslationContext = { registry: this }
    ): XMLElement | undefined {
        if (!context.acceptLanguages) {
            context.acceptLanguages = [];
        }
        context.acceptLanguages = context.acceptLanguages.map(lang => lang.toLowerCase());

        if (context.lang) {
            context.lang = context.lang.toLowerCase();
        }
        if (!context.sanitizers) {
            context.sanitizers = {
                xhtmlim: sanitizeXHTMLIM
            };
        }
        context.path = path;

        const fields = path.split('.').filter(item => {
            return item !== '';
        });
        let translator = this.root;

        for (const field of fields) {
            const nextTranslator = translator.getChild(field);
            if (!nextTranslator) {
                return;
            }
            translator = nextTranslator;
        }

        return translator.export(data, {
            ...context,
            registry: this
        });
    }

    public getImportKey(xml: XMLElement, path: string = ''): string | undefined {
        const root = !path ? this.root : this.walkToTranslator(path.split('.'));
        if (!root) {
            return undefined;
        }
        return root.getImportKey(xml);
    }

    public define(
        defs:
            | DefinitionOptions
            | DefinitionOptions[]
            | Plugin
            | Array<Plugin | DefinitionOptions | DefinitionOptions[]>
    ): void {
        if (Array.isArray(defs)) {
            for (const def of defs) {
                if (typeof def === 'object') {
                    this.define(def);
                } else {
                    def(this);
                }
            }
            return;
        } else if (typeof defs !== 'object') {
            defs(this);
            return;
        }

        const definition = defs;

        definition.aliases = definition.aliases || [];
        if (definition.path && !definition.aliases.includes(definition.path)) {
            definition.aliases.push(definition.path);
        }
        const aliases = definition.aliases
            .map(alias => (typeof alias === 'string' ? { path: alias } : alias))
            .sort((a, b) => {
                const aLen = a.path.split('.').length;
                const bLen = b.path.split('.').length;
                return bLen - aLen;
            });

        let translator: Translator | undefined;
        if (this.hasTranslator(definition.namespace, definition.element)) {
            // Get existing translator
            translator = this.getOrCreateTranslator(definition.namespace, definition.element);
        }
        if (!translator) {
            let placeholder: Translator | undefined;
            for (const alias of aliases) {
                const t = this.walkToTranslator(alias.path.split('.'));
                if (t && !t.placeholder) {
                    translator = t;
                    break;
                } else if (t) {
                    placeholder = t;
                }
            }
            if (placeholder && !translator) {
                translator = placeholder;
                translator.placeholder = false;
            }
        }
        if (!translator) {
            // Create a new translator
            translator = this.getOrCreateTranslator(definition.namespace, definition.element);
        }

        this.indexTranslator(definition.namespace, definition.element, translator);

        const fields = definition.fields || {};
        const importers: Map<string, FieldImporter> = new Map();
        const exporters: Map<string, FieldExporter> = new Map();

        const importerOrdering: Map<string, number> = new Map();
        const exporterOrdering: Map<string, number> = new Map();

        if (definition.typeField) {
            translator.typeField = definition.typeField;
        }
        if (definition.defaultType) {
            translator.defaultType = definition.defaultType;
        }
        if (definition.languageField) {
            translator.languageField = definition.languageField;
        }

        for (const key of Object.keys(fields)) {
            const field = fields[key];
            importers.set(key, field.importer);
            importerOrdering.set(key, field.importOrder || field.order || 0);
            exporters.set(key, field.exporter);
            exporterOrdering.set(key, field.exportOrder || field.order || 0);
        }

        if (definition.childrenExportOrder) {
            for (const [key, order] of Object.entries(definition.childrenExportOrder)) {
                exporterOrdering.set(key, order || 0);
            }
        }

        const optionalNamespaces: Map<string, string> = new Map();
        for (const [prefix, namespace] of Object.entries(definition.optionalNamespaces || {})) {
            optionalNamespaces.set(prefix, namespace);
        }

        translator.updateDefinition({
            contexts: new Map(),
            element: definition.element,
            exporterOrdering,
            exporters,
            importerOrdering,
            importers,
            namespace: definition.namespace,
            optionalNamespaces,
            type: definition.type,
            typeOrder: definition.typeOrder
        });

        for (const link of aliases) {
            this.alias(
                definition.namespace,
                definition.element,
                link.path,
                link.multiple,
                link.selector,
                link.contextField,
                definition.type,
                link.impliedType
            );
        }

        for (const alias of aliases) {
            const existing = this.walkToTranslator(alias.path.split('.'));
            if (existing && existing !== translator) {
                existing.replaceWith(translator);
            }
        }
    }

    public alias(
        namespace: string,
        element: string,
        path: string,
        multiple: boolean = false,
        selector?: string,
        contextField?: string,
        contextType?: string,
        contextImpliedType: boolean = false
    ): void {
        const linkedTranslator = this.getOrCreateTranslator(namespace, element);
        linkedTranslator.placeholder = false;

        const keys = path.split('.').filter(key => {
            return key !== '';
        });

        const finalKey = keys.pop()!;
        const translator = this.walkToTranslator(keys, true)!;
        const xid = `{${namespace}}${element}`;
        if (contextType && (contextField || contextImpliedType)) {
            linkedTranslator.addContext(
                path,
                selector,
                contextField,
                xid,
                contextType,
                contextImpliedType
            );
        }
        translator.addChild(finalKey, linkedTranslator, multiple, selector, xid);
    }

    private walkToTranslator(path: string[], vivify: boolean = false): Translator | undefined {
        let translator = this.root;
        for (const key of path) {
            let next = translator.getChild(key);
            if (!next) {
                if (vivify) {
                    next = new Translator();
                    next.placeholder = true;
                    translator.addChild(key, next);
                } else {
                    return;
                }
            }
            translator = next;
        }

        return translator;
    }

    private hasTranslator(namespace: string, element: string): boolean {
        return this.translators.has(`{${namespace}}${element}`);
    }

    private getOrCreateTranslator(namespace: string, element: string): Translator {
        let translator = this.translators.get(`{${namespace}}${element}`);
        if (!translator) {
            translator = new Translator();
            this.indexTranslator(namespace, element, translator);
        }
        return translator;
    }

    private indexTranslator(namespace: string, element: string, translator: Translator): void {
        this.translators.set(`{${namespace}}${element}`, translator);
    }
}
