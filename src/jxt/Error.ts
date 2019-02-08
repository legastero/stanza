export enum JXTErrorCondition {
    NotWellFormed = 'not-well-formed',
    RestrictedXML = 'restricted-xml',
    AlreadyClosed = 'already-closed',
    UnknownRoot = 'unknown-stream-root'
}

export interface JXTErrorOptions {
    condition: JXTErrorCondition;
    text?: string;
}

export default class JXTError extends Error {
    public static notWellFormed(text?: string) {
        return new JXTError({
            condition: JXTErrorCondition.NotWellFormed,
            text
        });
    }

    public static restrictedXML(text?: string) {
        return new JXTError({
            condition: JXTErrorCondition.RestrictedXML,
            text
        });
    }

    public static alreadyClosed(text?: string) {
        return new JXTError({
            condition: JXTErrorCondition.AlreadyClosed,
            text
        });
    }

    public static unknownRoot(text?: string) {
        return new JXTError({
            condition: JXTErrorCondition.UnknownRoot,
            text
        });
    }

    public isJXTError = true;
    public condition: JXTErrorCondition;
    public text?: string;

    constructor(opts: JXTErrorOptions) {
        super(opts.text);

        this.condition = opts.condition;
        this.text = opts.text;
    }
}
