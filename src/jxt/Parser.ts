/**
 * This file is derived from prior work.
 *
 * See NOTICE.md for full license text.
 *
 * Derived from: ltx, Copyright © 2010 Stephan Maka
 */

import { EventEmitter } from 'events';

import { unescapeXML } from './Definitions';
import XMLElement from './Element';
import JXTError from './Error';

const enum State {
    ATTR_EQ,
    ATTR_NAME,
    ATTR_QUOTE,
    ATTR_VALUE,
    CDATA,
    IGNORE_COMMENT,
    IGNORE_INSTRUCTION,
    TAG,
    TAG_NAME,
    TEXT,
    XML_DECLARATION
}

const enum Character {
    Tab = 9,
    NewLine = 10,
    CarriageReturn = 13,
    Space = 32,
    Exclamation = 33,
    DoubleQuote = 34,
    Ampersand = 38,
    SingleQuote = 39,
    Slash = 47,
    Semicolon = 59,
    LessThan = 60,
    Equal = 61,
    GreaterThan = 62,
    Question = 63,
    RightBracket = 93,
    X = 88,
    M = 77,
    L = 78,
    x = 120,
    m = 109,
    l = 108
}

export interface Attributes {
    [key: string]: string | undefined;
    xmlns?: string;
}

export interface ParserOptions {
    allowComments?: boolean;
}

function isPrintable(c: number): boolean {
    return c >= Character.Space;
}

function isWhitespace(c: number): boolean {
    return (
        c === Character.Space ||
        c === Character.NewLine ||
        c === Character.CarriageReturn ||
        c === Character.Tab
    );
}

export function parse(data: string, opts: ParserOptions = {}): XMLElement {
    const p = new Parser(opts);

    let result: XMLElement | undefined;
    let element: XMLElement | undefined;
    let error = null;

    p.on('text', (text: string) => {
        if (element) {
            element.children.push(text);
        }
    });

    p.on('startElement', (name: string, attrs: Attributes) => {
        const child = new XMLElement(name, attrs);
        if (!result) {
            result = child;
        }
        if (!element) {
            element = child;
        } else {
            element = element.appendChild(child) as XMLElement;
        }
    });

    p.on('endElement', (name: string) => {
        if (!element) {
            p.emit('error', JXTError.notWellFormed());
        } else if (name === element.name) {
            if (element.parent) {
                element = element.parent;
            } else if (!result) {
                result = element;
                element = undefined;
            }
        } else {
            p.emit('error', JXTError.notWellFormed());
        }
    });

    p.on('error', (e: Error) => {
        error = e;
    });

    p.write(data);
    p.end();

    if (error) {
        throw error;
    } else {
        return result!;
    }
}

export default class Parser extends EventEmitter {
    private allowComments = true;
    private attributeName?: string;
    private attributeQuote?: number;
    private attributes?: Attributes;
    private endTag: boolean = false;
    private recordStart?: number = 0;
    private remainder?: string;
    private selfClosing?: boolean;
    private state: State = State.TEXT;
    private tagName?: string;
    private haveDeclaration: boolean = false;
    private remainderPos?: number;

    constructor(opts: ParserOptions = {}) {
        super();
        if (opts.allowComments !== undefined) {
            this.allowComments = opts.allowComments;
        }
    }

    public write(data: string) {
        let pos = 0;

        if (this.remainder) {
            data = this.remainder + data;
            if (this.remainderPos !== undefined) {
                pos = this.remainderPos;
            } else {
                pos = this.remainder.length;
            }
            this.remainderPos = undefined;
            this.remainder = undefined;
        }

        for (; pos < data.length; pos++) {
            const c = data.charCodeAt(pos);
            switch (this.state) {
                case State.TEXT: {
                    if (c === Character.LessThan) {
                        const text = this.endRecording(data, pos);
                        if (text) {
                            let unescaped: string;
                            try {
                                unescaped = unescapeXML(text);
                            } catch (err) {
                                this.emit('error', err);
                                return;
                            }
                            this.emit('text', unescaped);
                        }
                        this.state = State.TAG_NAME;
                        this.recordStart = pos + 1;
                        this.attributes = {};
                    }
                    break;
                }

                case State.CDATA: {
                    if (c === Character.GreaterThan && this.lookBehindMatch(data, pos, ']]')) {
                        const text = this.endRecording(data, pos - 2);
                        if (text) {
                            this.emit('text', text);
                        }
                        this.state = State.TEXT;
                    }
                    break;
                }

                case State.TAG_NAME: {
                    if (c === Character.Slash && this.recordStart === pos) {
                        this.recordStart = pos + 1;
                        this.endTag = true;
                    } else if (c === Character.Exclamation) {
                        if (this.allowComments) {
                            const commentLookAhead = this.lookAheadMatch(data, pos, '--');
                            if (commentLookAhead === 1) {
                                this.recordStart = undefined;
                                this.state = State.IGNORE_COMMENT;
                                break;
                            } else if (commentLookAhead === 0) {
                                this.waitForData(data, pos);
                                return;
                            }
                        }

                        const cdataLookAhead = this.lookAheadMatch(data, pos, '[CDATA[');
                        if (cdataLookAhead === 1) {
                            this.recordStart = pos + 8;
                            this.state = State.CDATA;
                            break;
                        } else if (cdataLookAhead === 0) {
                            this.waitForData(data, pos);
                            return;
                        }

                        this.emit('error', JXTError.restrictedXML());
                        return;
                    } else if (c === Character.Question) {
                        this.recordStart = undefined;
                        if (!this.haveDeclaration) {
                            const xmlLookAhead = this.lookAheadMatch(data, pos, 'xml', true);
                            if (xmlLookAhead === 1) {
                                this.recordStart = pos + 4;
                                this.state = State.XML_DECLARATION;
                                break;
                            } else if (xmlLookAhead === 0) {
                                this.waitForData(data, pos);
                                return;
                            }
                        }

                        this.emit('error', JXTError.restrictedXML());
                        return;
                    } else if (
                        !isPrintable(c) ||
                        isWhitespace(c) ||
                        c === Character.Slash ||
                        c === Character.GreaterThan ||
                        c === Character.LessThan
                    ) {
                        this.tagName = this.endRecording(data, pos);
                        pos--;
                        this.state = State.TAG;
                    }
                    break;
                }

                case State.IGNORE_COMMENT: {
                    if (
                        c === Character.GreaterThan &&
                        (this.lookBehindMatch(data, pos, '--') ||
                            this.lookBehindMatch(data, pos, ']]'))
                    ) {
                        this.state = State.TEXT;
                    }
                    break;
                }

                case State.XML_DECLARATION: {
                    if (
                        (c === Character.x || c === Character.X) &&
                        this.lookBehindMatch(data, pos, '?', true)
                    ) {
                        break;
                    } else if (
                        (c === Character.m || c === Character.M) &&
                        this.lookBehindMatch(data, pos, '?x', true)
                    ) {
                        break;
                    } else if (
                        (c === Character.l || c === Character.L) &&
                        this.lookBehindMatch(data, pos, '?xm', true)
                    ) {
                        break;
                    } else if (isWhitespace(c)) {
                        this.haveDeclaration = true;
                        this.state = State.IGNORE_INSTRUCTION;
                        break;
                    }

                    this.emit('error', JXTError.restrictedXML());
                    return;
                }

                case State.IGNORE_INSTRUCTION: {
                    if (c === Character.GreaterThan && this.lookBehindMatch(data, pos, '?')) {
                        this.state = State.TEXT;
                    }
                    break;
                }

                case State.TAG: {
                    if (c === Character.GreaterThan || c === Character.LessThan) {
                        this.handleTagOpening(this.endTag, this.tagName!, this.attributes!);
                        this.tagName = undefined;
                        this.attributes = undefined;
                        this.endTag = false;
                        this.selfClosing = false;
                        this.state = State.TEXT;
                        this.recordStart = pos + 1;
                    } else if (c === Character.Slash) {
                        this.selfClosing = true;
                    } else if (isPrintable(c) && c !== Character.Space) {
                        this.recordStart = pos;
                        this.state = State.ATTR_NAME;
                    }
                    break;
                }

                case State.ATTR_NAME: {
                    if (!isPrintable(c) || isWhitespace(c) || c === Character.Equal) {
                        this.attributeName = this.endRecording(data, pos);
                        pos--;
                        this.state = State.ATTR_EQ;
                    }
                    break;
                }

                case State.ATTR_EQ: {
                    if (isWhitespace(c)) {
                        break;
                    }
                    if (c === Character.Equal) {
                        this.state = State.ATTR_QUOTE;
                        break;
                    }

                    this.emit('error', JXTError.notWellFormed());
                    return;
                }

                case State.ATTR_QUOTE: {
                    if (isWhitespace(c)) {
                        break;
                    }
                    if (c === Character.DoubleQuote || c === Character.SingleQuote) {
                        this.attributeQuote = c;
                        this.state = State.ATTR_VALUE;
                        this.recordStart = pos + 1;
                    }
                    break;
                }

                case State.ATTR_VALUE: {
                    if (c === this.attributeQuote) {
                        let value: string;
                        try {
                            value = unescapeXML(this.endRecording(data, pos));
                        } catch (err) {
                            this.emit('error', err);
                            return;
                        }
                        if (this.attributes![this.attributeName!] !== undefined) {
                            this.emit('error', JXTError.notWellFormed());
                            return;
                        }
                        this.attributes![this.attributeName!] = value;
                        this.attributeName = undefined;
                        this.state = State.TAG;
                    }
                }
            }
        }

        if (this.recordStart !== undefined && this.recordStart <= data.length) {
            this.remainder = data.slice(this.recordStart);
            this.recordStart = 0;
        }
    }

    public end(data?: string) {
        if (data) {
            this.write(data);
        }
        this.write = () => undefined;
    }

    private endRecording(data: string, pos: number): string {
        if (this.recordStart !== undefined) {
            const recorded = data.slice(this.recordStart, pos);
            this.recordStart = undefined;
            return recorded;
        }
        return '';
    }

    private handleTagOpening(endTag: boolean, tagName: string, attrs: Attributes) {
        if (!endTag) {
            this.emit('startElement', tagName, attrs);
            if (this.selfClosing) {
                this.emit('endElement', tagName);
            }
        } else {
            this.emit('endElement', tagName);
        }
    }

    private waitForData(data: string, pos: number): void {
        this.remainder = data.substr(pos);
        this.remainderPos = pos;
    }

    private lookAheadMatch(
        data: string,
        pos: number,
        search: string,
        lowercase: boolean = false
    ): number {
        const needed = search.length;
        let lookahead = data.substr(pos + 1, needed);
        if (lowercase) {
            lookahead = lookahead.toLowerCase();
        }

        if (lookahead.length === needed && lookahead === search) {
            return 1;
        }
        if (lookahead.length < needed && search.startsWith(lookahead)) {
            return 0;
        }
        return -1;
    }

    private lookBehindMatch(
        data: string,
        pos: number,
        search: string,
        lowercase: boolean = false
    ): boolean {
        if (pos - search.length < 0) {
            return false;
        }
        if (lowercase) {
            return data.substr(pos - search.length, search.length).toLowerCase() === search;
        }
        return data.substr(pos - search.length, search.length) === search;
    }
}
