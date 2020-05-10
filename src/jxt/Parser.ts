/**
 * This file is derived from prior work.
 *
 * See NOTICE.md for full license text.
 *
 * Derived from: ltx, Copyright © 2010 Stephan Maka
 */

// tslint:disable cognitive-complexity max-switch-cases

import { EventEmitter } from 'events';

import { unescapeXML } from './Definitions';
import XMLElement from './Element';
import JXTError from './Error';

const enum State {
    ATTR_NAME,
    ATTR_QUOTE_DOUBLE,
    ATTR_QUOTE_SINGLE,
    ATTR_WAIT_EQ,
    ATTR_WAIT_QUOTE,
    CDATA,
    CLOSING_TAG_NAME,
    CLOSING_TAG_START,
    CLOSING_TAG,
    END_CDATA_RB_RB,
    END_CDATA_RB,
    END_COMMENT_DASH_DASH,
    END_COMMENT_DASH,
    END_XML_DECLARATION_QM,
    IGNORE_COMMENT,
    IGNORE_INSTRUCTION,
    START_CDATA_LB_C_D_A_T_A,
    START_CDATA_LB_C_D_A_T,
    START_CDATA_LB_C_D_A,
    START_CDATA_LB_C_D,
    START_CDATA_LB_C,
    START_CDATA_LB,
    START_CDATA,
    START_COMMENT_DASH,
    START_INSTRUCTION,
    START_PROCESSING_INSTRUCTION,
    START_XML_DECLARATION_X_M_L,
    START_XML_DECLARATION_X_M,
    START_XML_DECLARATION_X,
    TAG_END_SLASH,
    TAG_NAME,
    TAG_START,
    TAG_WAIT_NAME,
    TAG,
    TEXT,
    XML_DECLARATION
}

const enum Character {
    Ampersand = 38,
    CarriageReturn = 13,
    Colon = 58,
    Dash = 45,
    DoubleQuote = 34,
    Equal = 61,
    Exclamation = 33,
    GreaterThan = 62,
    LeftBracket = 91,
    LessThan = 60,
    NewLine = 10,
    Period = 46,
    Question = 63,
    RightBracket = 93,
    Semicolon = 59,
    SingleQuote = 39,
    Slash = 47,
    Space = 32,
    Tab = 9,
    Underscore = 95,

    A = 65,
    C = 67,
    D = 68,
    L = 76,
    M = 77,
    T = 84,
    X = 88,
    Z = 90,

    a = 97,
    l = 108,
    m = 109,
    x = 120,
    z = 122,

    Zero = 48,
    Nine = 57
}

export interface Attributes {
    [key: string]: string | undefined;
    xmlns?: string;
}

export interface ParserOptions {
    allowComments?: boolean;
}

function isBasicNameStart(c: number): boolean {
    return (
        (Character.a <= c && c <= Character.z) ||
        (Character.A <= c && c <= Character.Z) ||
        c === Character.Colon ||
        c === Character.Underscore
    );
}

function isExtendedNameStart(c: number): boolean {
    return (
        (0xc0 <= c && c <= 0xd6) ||
        (0xd8 <= c && c <= 0xf6) ||
        (0xf8 <= c && c <= 0x2ff) ||
        (0x370 <= c && c <= 0x37d) ||
        (0x37f <= c && c <= 0x1fff) ||
        (0x200c <= c && c <= 0x200d) ||
        (0x2070 <= c && c <= 0x218f) ||
        (0x2c00 <= c && c <= 0x2fef) ||
        (0x3001 <= c && c <= 0xd7ff) ||
        (0xfdf0 <= c && c <= 0xfffd) ||
        (0x10000 <= c && c <= 0xeffff)
    );
}

function isNameStart(c: number): boolean {
    return isBasicNameStart(c) || isExtendedNameStart(c);
}

function isName(c: number): boolean {
    return (
        isBasicNameStart(c) ||
        c === Character.Dash ||
        c === Character.Period ||
        (Character.Zero <= c && c <= Character.Nine) ||
        c === 0xb7 ||
        (0x0300 <= c && c <= 0x036f) ||
        (0x203f <= c && c <= 0x2040) ||
        isExtendedNameStart(c)
    );
}

function isWhitespace(c: number): boolean {
    return (
        c === Character.Space ||
        c === Character.NewLine ||
        c === Character.CarriageReturn ||
        c === Character.Tab
    );
}

class Parser extends EventEmitter {
    private allowComments = true;
    private attributeName?: string;
    private attributes?: Attributes = {};
    private state: State = State.TEXT;
    private tagName?: string = '';
    private haveDeclaration = false;
    private recordBuffer: string[] = [];

    constructor(opts: ParserOptions = {}) {
        super();
        if (opts.allowComments !== undefined) {
            this.allowComments = opts.allowComments;
        }
    }

    public write(data: string) {
        for (const char of data) {
            const c = char.codePointAt(0)!;

            switch (this.state) {
                case State.TEXT: {
                    if (c === Character.LessThan) {
                        let text: string;
                        try {
                            text = unescapeXML(this.endRecord());
                        } catch (err) {
                            this.emit('error', err);
                            return;
                        }
                        if (text) {
                            this.emit('text', text);
                        }
                        this.transition(State.TAG_START);
                        continue;
                    } else {
                        this.record(char);
                        continue;
                    }
                }

                case State.TAG_START: {
                    if (c === Character.Slash) {
                        this.transition(State.CLOSING_TAG_START);
                        continue;
                    }
                    if (c === Character.Exclamation) {
                        this.transition(State.START_INSTRUCTION);
                        continue;
                    }
                    if (c === Character.Question) {
                        if (this.haveDeclaration) {
                            this.restrictedXML();
                        }

                        this.transition(State.START_PROCESSING_INSTRUCTION);
                        continue;
                    }
                    if (isNameStart(c)) {
                        this.transition(State.TAG_NAME);
                        this.startRecord(char);
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.TAG_NAME: {
                    if (isName(c)) {
                        this.record(char);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        this.startTag();
                        this.transition(State.TAG_WAIT_NAME);
                        continue;
                    }
                    if (c === Character.Slash) {
                        this.startTag();
                        this.transition(State.TAG_END_SLASH);
                        continue;
                    }
                    if (c === Character.GreaterThan) {
                        this.startTag();
                        this.transition(State.TEXT);
                        this.emit('startElement', this.tagName, this.attributes);
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.TAG_END_SLASH: {
                    if (c === Character.GreaterThan) {
                        this.emit('startElement', this.tagName, this.attributes);
                        this.emit('endElement', this.tagName);
                        this.transition(State.TEXT);
                        continue;
                    }
                    return this.notWellFormed();
                }

                case State.TAG: {
                    if (isWhitespace(c)) {
                        this.transition(State.TAG_WAIT_NAME);
                        continue;
                    }
                    if (c === Character.Slash) {
                        this.transition(State.TAG_END_SLASH);
                        continue;
                    }
                    if (c === Character.GreaterThan) {
                        this.emit('startElement', this.tagName, this.attributes);
                        this.transition(State.TEXT);
                        continue;
                    }
                    return this.notWellFormed();
                }

                case State.TAG_WAIT_NAME: {
                    if (isWhitespace(c)) {
                        continue;
                    }
                    if (isNameStart(c)) {
                        this.startRecord(char);
                        this.transition(State.ATTR_NAME);
                        continue;
                    }
                    if (c === Character.Slash) {
                        this.transition(State.TAG_END_SLASH);
                        continue;
                    }
                    if (c === Character.GreaterThan) {
                        this.emit('startElement', this.tagName, this.attributes);
                        this.transition(State.TEXT);
                        continue;
                    }
                    return this.notWellFormed();
                }

                case State.CLOSING_TAG_START: {
                    if (isNameStart(c)) {
                        this.startRecord(char);
                        this.transition(State.CLOSING_TAG_NAME);
                        continue;
                    }
                    return this.notWellFormed();
                }

                case State.CLOSING_TAG_NAME: {
                    if (isName(c)) {
                        this.record(char);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        this.transition(State.CLOSING_TAG);
                        continue;
                    }
                    if (c === Character.GreaterThan) {
                        const tag = this.endRecord();
                        this.emit('endElement', tag, this.attributes);

                        this.transition(State.TEXT);
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.CLOSING_TAG: {
                    if (isWhitespace(c)) {
                        continue;
                    }
                    if (c === Character.GreaterThan) {
                        const tag = this.endRecord();
                        this.emit('endElement', tag, this.attributes);

                        this.transition(State.TEXT);
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.ATTR_NAME: {
                    if (isName(c)) {
                        this.record(char);
                        continue;
                    }
                    if (c === Character.Equal) {
                        this.addAttribute();
                        this.transition(State.ATTR_WAIT_QUOTE);
                        continue;
                    }

                    if (isWhitespace(c)) {
                        this.addAttribute();
                        this.transition(State.ATTR_WAIT_EQ);
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.ATTR_WAIT_EQ: {
                    if (c === Character.Equal) {
                        this.transition(State.ATTR_WAIT_QUOTE);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.ATTR_WAIT_QUOTE: {
                    if (c === Character.DoubleQuote) {
                        this.startRecord();
                        this.transition(State.ATTR_QUOTE_DOUBLE);
                        continue;
                    }
                    if (c === Character.SingleQuote) {
                        this.startRecord();
                        this.transition(State.ATTR_QUOTE_SINGLE);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.ATTR_QUOTE_DOUBLE:
                case State.ATTR_QUOTE_SINGLE: {
                    if (
                        (c === Character.DoubleQuote && this.state === State.ATTR_QUOTE_DOUBLE) ||
                        (c === Character.SingleQuote && this.state === State.ATTR_QUOTE_SINGLE)
                    ) {
                        const value = this.endRecord();
                        this.attributes![this.attributeName!] = unescapeXML(value);
                        this.transition(State.TAG);
                        continue;
                    }
                    if (c === Character.LessThan) {
                        return this.notWellFormed();
                    }

                    this.record(char);
                    continue;
                }

                case State.START_INSTRUCTION: {
                    if (c === Character.Dash) {
                        if (!this.allowComments) {
                            this.restrictedXML();
                        }
                        this.transition(State.START_COMMENT_DASH);
                        continue;
                    }
                    if (c === Character.LeftBracket) {
                        this.transition(State.START_CDATA_LB);
                        continue;
                    }

                    return this.notWellFormed();
                }

                case State.START_COMMENT_DASH: {
                    if (c === Character.Dash) {
                        this.transition(State.IGNORE_COMMENT);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case State.IGNORE_COMMENT: {
                    if (c === Character.Dash) {
                        this.transition(State.END_COMMENT_DASH);
                    }
                    continue;
                }
                case State.END_COMMENT_DASH: {
                    if (c === Character.Dash) {
                        this.transition(State.END_COMMENT_DASH_DASH);
                    } else {
                        this.transition(State.IGNORE_COMMENT);
                    }
                    continue;
                }
                case State.END_COMMENT_DASH_DASH: {
                    if (c === Character.GreaterThan) {
                        this.transition(State.TEXT);
                    } else {
                        this.transition(State.IGNORE_COMMENT);
                    }
                    continue;
                }

                case State.START_PROCESSING_INSTRUCTION: {
                    if (c === Character.X || c === Character.x) {
                        this.transition(State.START_XML_DECLARATION_X);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case State.START_XML_DECLARATION_X: {
                    if (c === Character.M || c === Character.m) {
                        this.transition(State.START_XML_DECLARATION_X_M);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case State.START_XML_DECLARATION_X_M: {
                    if (c === Character.L || c === Character.l) {
                        this.transition(State.START_XML_DECLARATION_X_M_L);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case State.START_XML_DECLARATION_X_M_L: {
                    if (isWhitespace(c)) {
                        this.haveDeclaration = true;
                        this.transition(State.IGNORE_INSTRUCTION);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case State.END_XML_DECLARATION_QM: {
                    if (c === Character.GreaterThan) {
                        this.transition(State.TEXT);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case State.IGNORE_INSTRUCTION: {
                    if (c === Character.Question) {
                        this.transition(State.END_XML_DECLARATION_QM);
                    }
                    continue;
                }

                case State.START_CDATA_LB: {
                    this.wait(c, Character.C, State.START_CDATA_LB_C);
                    continue;
                }
                case State.START_CDATA_LB_C: {
                    this.wait(c, Character.D, State.START_CDATA_LB_C_D);
                    continue;
                }
                case State.START_CDATA_LB_C_D: {
                    this.wait(c, Character.A, State.START_CDATA_LB_C_D_A);
                    continue;
                }
                case State.START_CDATA_LB_C_D_A: {
                    this.wait(c, Character.T, State.START_CDATA_LB_C_D_A_T);
                    continue;
                }
                case State.START_CDATA_LB_C_D_A_T: {
                    this.wait(c, Character.A, State.START_CDATA_LB_C_D_A_T_A);
                    continue;
                }
                case State.START_CDATA_LB_C_D_A_T_A: {
                    this.wait(c, Character.LeftBracket, State.CDATA);
                    continue;
                }
                case State.CDATA: {
                    if (c === Character.RightBracket) {
                        this.transition(State.END_CDATA_RB);
                        continue;
                    }

                    this.record(char);
                    continue;
                }
                case State.END_CDATA_RB: {
                    if (c === Character.RightBracket) {
                        this.transition(State.END_CDATA_RB_RB);
                    } else {
                        this.record(String.fromCodePoint(Character.RightBracket));
                        this.record(char);
                        this.transition(State.CDATA);
                    }
                    continue;
                }
                case State.END_CDATA_RB_RB: {
                    if (c === Character.GreaterThan) {
                        const text = this.endRecord();
                        if (text) {
                            this.emit('text', text);
                        }
                        this.transition(State.TEXT);
                    } else {
                        this.record(String.fromCodePoint(Character.RightBracket));
                        this.record(String.fromCodePoint(Character.RightBracket));
                        this.record(char);
                        this.transition(State.CDATA);
                    }
                    continue;
                }
            }
        }
    }

    public end(data?: string) {
        if (data) {
            this.write(data);
        }
        this.write = () => undefined;
    }

    private record(char: string): void {
        this.recordBuffer.push(char);
    }

    private startRecord(char?: string): void {
        this.recordBuffer = [];
        if (char) {
            this.recordBuffer.push(char);
        }
    }

    private endRecord(): string {
        const data = this.recordBuffer;
        this.recordBuffer = [];
        return data.join('');
    }

    private startTag(): void {
        this.tagName = this.endRecord();
        this.attributes = {};
    }

    private addAttribute(): void {
        const name = this.endRecord();
        if (this.attributes![name] !== undefined) {
            return this.notWellFormed();
        }
        this.attributeName = name;
        this.attributes![name] = '';
    }

    private wait(c: number, nextChar: number, newState: State): void {
        if (c === nextChar) {
            this.transition(newState);
            return;
        }
        return this.notWellFormed();
    }

    private transition(state: State): void {
        this.state = state;
        if (state === State.TEXT) {
            this.startRecord();
        }
    }

    private notWellFormed(msg?: string): void {
        this.emit('error', JXTError.notWellFormed(msg));
    }
    private restrictedXML(msg?: string): void {
        this.emit('error', JXTError.restrictedXML(msg));
    }
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
            p.emit('error', JXTError.notWellFormed('a'));
        } else if (name === element.name) {
            if (element.parent) {
                element = element.parent;
            }
        } else {
            p.emit('error', JXTError.notWellFormed('b'));
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

export default Parser;
