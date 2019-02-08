import { DefinitionOptions as Definition, Plugin } from './Definitions';
import XMLElement, { JSONElement } from './Element';
import Registry from './Registry';
import Translator from './Translator';

export * from './Definitions';
export * from './Types';

export { default as Parser, parse } from './Parser';
export { default as StreamParser, ParsedData } from './StreamParser';

export { Registry, Translator, XMLElement, JSONElement };

export function define(definitions: Array<Definition | Plugin> | Definition | Plugin): Plugin {
    return (registry: Registry) => {
        registry.define(definitions);
    };
}
