import { DataFormField } from './stanzas';

export function mergeFields(original: DataFormField[], updated: DataFormField[]): DataFormField[] {
    const merged: DataFormField[] = [];

    const mappedUpdates: Map<string, DataFormField> = new Map();
    for (const field of updated) {
        if (field.name) {
            mappedUpdates.set(field.name, field);
        }
    }
    const usedUpdates: Set<string> = new Set();

    // Update any existing fields with new values.
    for (const field of original) {
        if (field.name && mappedUpdates.has(field.name)) {
            merged.push({
                ...field,
                ...mappedUpdates.get(field.name)
            } as DataFormField);
            usedUpdates.add(field.name);
        } else {
            merged.push({ ...field });
        }
    }

    // Append any brand new fields to the list
    for (const field of updated) {
        if (!field.name || (field.name && !usedUpdates.has(field.name))) {
            merged.push({ ...field });
        }
    }

    return merged;
}
