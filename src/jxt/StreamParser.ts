import { Transform } from 'stream';

import { JSONData } from './Definitions';
import XMLElement from './Element';
import JXTError from './Error';
import Parser, { Attributes } from './Parser';
import Registry from './Registry';

export interface StreamParserOptions {
    allowComments?: boolean;
    registry: Registry;
    lang?: string;
    acceptLanguages?: string[];
    wrappedStream?: boolean;
    rootKey?: string;
}

export interface ParsedData {
    event?: string;
    kind: string;
    stanza: JSONData;
    xml: XMLElement;
}

export default class StreamParser extends Transform {
    private closedStream: boolean = false;
    private wrappedStream: boolean = false;
    private registry: Registry;
    private lang?: string;
    private acceptLanguages: string[];
    private currentElement?: XMLElement;
    private rootElement?: XMLElement;
    private rootImportKey?: string;
    private parser: Parser;

    constructor(opts: StreamParserOptions) {
        super({ objectMode: true });

        this.registry = opts.registry;
        this.acceptLanguages = opts.acceptLanguages || [];

        if (opts.wrappedStream) {
            this.wrappedStream = true;
            this.rootImportKey = opts.rootKey;
        }

        this.parser = new Parser({
            allowComments: opts.allowComments
        });

        this.parser.on('startElement', (name: string, attributes: Attributes) => {
            if (this.closedStream) {
                return this.emit('error', JXTError.alreadyClosed());
            }

            const el = new XMLElement(name, attributes);
            const key = this.registry.getImportKey(el);

            if (this.wrappedStream && !this.rootElement) {
                if (this.rootImportKey && key !== this.rootImportKey) {
                    return this.emit('error', JXTError.unknownRoot());
                }

                const root = this.registry.import(el, {
                    acceptLanguages: this.acceptLanguages,
                    lang: this.lang
                });

                if (root) {
                    this.rootElement = el;
                    this.push({
                        event: 'stream-start',
                        kind: key,
                        stanza: root,
                        xml: el
                    });
                    return;
                } else {
                    return this.emit('error', JXTError.notWellFormed());
                }
            }

            if (!this.currentElement) {
                this.currentElement = el;
            } else {
                this.currentElement = this.currentElement.appendChild(el) as XMLElement;
            }
        });

        this.parser.on('endElement', (name: string) => {
            if (this.wrappedStream && !this.currentElement) {
                if (!this.rootElement || name !== this.rootElement.name) {
                    this.closedStream = true;
                    return this.emit('error', JXTError.notWellFormed());
                }
                this.closedStream = true;
                this.push({
                    event: 'stream-end',
                    kind: this.rootImportKey,
                    stanza: {},
                    xml: this.rootElement
                });
                return this.end();
            }

            if (!this.currentElement || name !== this.currentElement.name) {
                this.closedStream = true;
                return this.emit('error', JXTError.notWellFormed());
            }

            if (this.currentElement.parent) {
                this.currentElement = this.currentElement.parent;
            } else {
                if (this.wrappedStream) {
                    this.currentElement.parent = this.rootElement;
                }
                const key = this.registry.getImportKey(this.currentElement);
                const stanza = this.registry.import(this.currentElement, {
                    acceptLanguages: this.acceptLanguages,
                    lang: this.lang
                });

                if (stanza) {
                    this.push({
                        kind: key,
                        stanza,
                        xml: this.currentElement
                    });
                }

                this.currentElement = undefined;
            }
        });

        this.parser.on('text', (text: string) => {
            if (this.currentElement) {
                this.currentElement.children.push(text);
            }
        });
    }

    public _transform(chunk: Buffer, encoding: string, done: () => void): void {
        this.parser.write(chunk.toString());
        done();
    }
}
