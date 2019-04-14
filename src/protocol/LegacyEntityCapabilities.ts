import * as Hashes from '../lib/crypto';
import { octetCompare } from '../Utils';

import { DataForm, DataFormField, DiscoInfo, DiscoInfoIdentity } from './stanzas';

function escape(value: string): Buffer {
    return new Buffer(value.replace(/</g, '&lt;'), 'utf-8');
}

function encodeIdentities(identities: DiscoInfoIdentity[] = []): Buffer[] | null {
    let result: Buffer[] = [];
    const existing = new Set<string>();

    for (const { category, type, lang, name } of identities) {
        const encoded = `${category}/${type}/${lang || ''}/${name || ''}`;
        if (existing.has(encoded)) {
            return null;
        }
        existing.add(encoded);
        result.push(escape(encoded));
    }

    result = result.sort(octetCompare);
    return result;
}

function encodeFeatures(features: string[] = []): Buffer[] | null {
    let result: Buffer[] = [];
    const existing = new Set<string>();

    for (const feature of features) {
        if (existing.has(feature)) {
            return null;
        }
        existing.add(feature);
        result.push(escape(feature));
    }

    result = result.sort(octetCompare);
    return result;
}

function encodeForms(extensions: DataForm[] = []): Buffer[] | null {
    let forms: Array<{ type: Buffer; form: DataForm }> = [];
    const types = new Set<string>();

    for (const form of extensions) {
        let type: Buffer | undefined;

        for (const field of form.fields || []) {
            if (
                field.name === 'FORM_TYPE' &&
                field.type === 'hidden' &&
                field.rawValues &&
                field.rawValues.length === 1
            ) {
                type = escape(field.rawValues[0]);
                break;
            }
        }

        if (!type) {
            continue;
        }

        if (types.has(type.toString())) {
            return null;
        }
        types.add(type.toString());

        forms.push({ type, form });
    }

    forms = forms.sort((a, b) => octetCompare(a.type, b.type));

    const results: Buffer[] = [];

    for (const form of forms) {
        results.push(form.type);
        const fields = encodeFields(form.form.fields);

        for (const field of fields) {
            results.push(field);
        }
    }

    return results;
}

function encodeFields(fields: DataFormField[] = []): Buffer[] {
    let sortedFields: Array<{ name: Buffer; values: Buffer[] }> = [];

    for (const field of fields) {
        if (field.name === 'FORM_TYPE') {
            continue;
        }
        sortedFields.push({
            name: escape(field.name!),
            values: (field.rawValues || []).map(val => escape(val)).sort(octetCompare)
        });
    }

    sortedFields = sortedFields.sort((a, b) => octetCompare(a.name, b.name));

    const result: Buffer[] = [];

    for (const field of sortedFields) {
        result.push(field.name);
        for (const value of field.values) {
            result.push(value);
        }
    }

    return result;
}

export function generate(info: DiscoInfo, hashName: string): string | null {
    const S: Buffer[] = [];
    const separator = new Buffer('<');

    const append = (b1: Buffer, b2?: Buffer) => {
        S.push(b1);
        S.push(separator);
        if (b2) {
            S.push(b2);
        }
    };

    const identities = encodeIdentities(info.identities);
    const features = encodeFeatures(info.features);
    const extensions = encodeForms(info.extensions);

    if (!identities || !features || !extensions) {
        return null;
    }

    for (const id of identities) {
        append(id);
    }
    for (const feature of features) {
        append(feature);
    }
    for (const form of extensions) {
        append(form);
    }

    let version = Hashes.createHash(hashName)
        .update(Buffer.concat(S))
        .digest('base64');

    let padding = 4 - (version.length % 4);
    if (padding === 4) {
        padding = 0;
    }
    for (let i = 0; i < padding; i++) {
        version += '=';
    }

    return version;
}

export function verify(info: DiscoInfo, hashName: string, check: string): boolean {
    const computed = generate(info, hashName);
    return !!computed && computed === check;
}
