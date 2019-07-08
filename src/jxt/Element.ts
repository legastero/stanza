import { escapeXML, escapeXMLText } from './Definitions';

export interface Attributes {
    [key: string]: string | undefined;
    xmlns?: string;
}

export interface JSONElement {
    name: string;
    children: Array<JSONElement | string>;
    attributes: Attributes;
}

export default class XMLElement {
    public name: string;
    public parent?: XMLElement;
    public children: Array<XMLElement | string>;
    public attributes: Attributes;

    constructor(
        name: string,
        attrs: Attributes = {},
        children: Array<XMLElement | JSONElement | string> = []
    ) {
        this.name = name;
        this.attributes = attrs;
        this.children = [];

        for (const child of children) {
            if (typeof child !== 'string') {
                const xmlChild = new XMLElement(child.name, child.attributes, child.children);
                xmlChild.parent = this;
                this.children.push(xmlChild);
            } else {
                this.children.push(child);
            }
        }
    }

    public getName(): string {
        if (this.name.indexOf(':') >= 0) {
            return this.name.substr(this.name.indexOf(':') + 1);
        } else {
            return this.name;
        }
    }

    public getNamespace(): string {
        if (this.name.indexOf(':') >= 0) {
            const prefix = this.name.substr(0, this.name.indexOf(':'));
            return this.findNamespaceForPrefix(prefix);
        }
        return this.findNamespaceForPrefix();
    }

    public getNamespaceContext(): { [key: string]: string } {
        let namespaces: { [key: string]: string } = {};

        if (this.parent) {
            namespaces = this.parent.getNamespaceContext();
        }

        for (const attr of Object.keys(this.attributes)) {
            if (attr.startsWith('xmlns:')) {
                const prefix = attr.substr(6);
                namespaces[this.attributes[attr]!] = prefix;
            }
        }
        return namespaces;
    }

    public getAttribute(name: string, xmlns?: string | null): string | undefined {
        if (!xmlns) {
            return this.attributes[name];
        }

        const namespaces = this.getNamespaceContext();

        if (!namespaces[xmlns]) {
            return undefined;
        }

        return this.attributes[[namespaces[xmlns], name].join(':')];
    }

    public getChild(name: string, xmlns?: string | undefined | null): XMLElement | undefined {
        return this.getChildren(name, xmlns)[0];
    }

    public getChildren(name: string, xmlns?: string | undefined | null): XMLElement[] {
        const result: XMLElement[] = [];
        for (const child of this.children) {
            if (
                typeof child !== 'string' &&
                child.getName() === name &&
                (!xmlns || child.getNamespace() === xmlns)
            ) {
                result.push(child);
            }
        }
        return result;
    }

    public getText(): string {
        let text = '';
        for (const child of this.children) {
            if (typeof child === 'string') {
                text += child;
            }
        }
        return text;
    }

    public appendChild(child: XMLElement | string): XMLElement | string {
        this.children.push(child);
        if (typeof child !== 'string') {
            child.parent = this;
        }
        return child;
    }

    public setAttribute(
        attr: string,
        val: string | null | undefined,
        force: boolean = false
    ): void {
        this.attributes[attr] = val || undefined;
        if (val === '' && force) {
            this.attributes[attr] = val;
        }
    }

    public toJSON(): JSONElement {
        const children: Array<JSONElement | string> = this.children
            .map(child => {
                if (typeof child === 'string') {
                    return child;
                }
                if (child) {
                    return child.toJSON();
                }
            })
            .filter(child => !!child) as Array<JSONElement | string>;

        // Strip any undefined/null attributes
        const attrs: { [key: string]: string | undefined } = {};
        for (const key of Object.keys(this.attributes)) {
            if (this.attributes[key] !== undefined && this.attributes[key] !== null) {
                attrs[key] = this.attributes[key];
            }
        }

        return {
            attributes: attrs,
            children,
            name: this.name
        };
    }

    public toString(): string {
        let output = this.openTag(true);

        if (this.children.length) {
            for (const child of this.children) {
                if (typeof child === 'string') {
                    output += escapeXMLText(child);
                } else if (child) {
                    output += child.toString();
                }
            }
            output += this.closeTag();
        }

        return output;
    }

    public openTag(allowSelfClose: boolean = false): string {
        let output = '';

        output += `<${this.name}`;
        for (const key of Object.keys(this.attributes)) {
            const value = this.attributes[key];
            if (value !== undefined) {
                output += ` ${key}="${escapeXML(value.toString())}"`;
            }
        }
        if (allowSelfClose && this.children.length === 0) {
            output += '/>';
        } else {
            output += '>';
        }

        return output;
    }

    public closeTag(): string {
        return `</${this.name}>`;
    }

    private findNamespaceForPrefix(prefix?: string): string {
        if (!prefix) {
            if (this.attributes.xmlns) {
                return this.attributes.xmlns;
            } else if (this.parent) {
                return this.parent.findNamespaceForPrefix();
            }
        } else {
            const attr = 'xmlns:' + prefix;
            if (this.attributes[attr]) {
                return this.attributes[attr] as string;
            } else if (this.parent) {
                return this.parent.findNamespaceForPrefix(prefix);
            }
        }
        return '';
    }
}
