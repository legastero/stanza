import * as FS from 'fs';
import * as tape from 'tape';

import { parse, Registry, XMLElement } from '../src/jxt';
import XMPP from '../src/protocol';

const test = tape.test;

const registry = new Registry();
registry.define(XMPP);

const removeWhiteSpace = (xml: XMLElement): XMLElement => {
    xml.children = (xml.children || [])
        .map(child => {
            if (typeof child === 'string') {
                if (child.trim() === '') {
                    return undefined;
                }
                return child;
            }
            return removeWhiteSpace(child);
        })
        .filter(child => !!child) as Array<string | XMLElement>;

    return xml;
};

const testCaseFolders = FS.readdirSync(__dirname + '/protocol-cases');
const testSuites: Map<string, Set<string>> = new Map();

for (const dir of testCaseFolders) {
    if (dir === 'README.md') {
        continue;
    }
    const cases = new Set<string>();

    const testCaseFiles = FS.readdirSync(__dirname + '/protocol-cases/' + dir);
    for (const file of testCaseFiles) {
        cases.add(file.substring(0, file.lastIndexOf('.')));
    }

    testSuites.set(dir, cases);
}

for (const [testSuite, testCases] of testSuites) {
    for (const testCase of testCases) {
        const xml = removeWhiteSpace(
            parse(
                FS.readFileSync(
                    __dirname + '/protocol-cases/' + testSuite + '/' + testCase + '.xml'
                ).toString()
            )
        )!;

        // We are testing XMPP definitions, so assume we are using the jabber:client
        // namespace if not specified.
        if (!xml.getNamespace()) {
            xml.attributes.xmlns = 'jabber:client';
        }

        const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        const json = JSON.parse(
            FS.readFileSync(
                __dirname + '/protocol-cases/' + testSuite + '/' + testCase + '.json'
            ).toString(),
            (_, value) => {
                if (typeof value === 'string' && dateFormat.test(value)) {
                    return new Date(value);
                }
                return value;
            }
        );

        const jsonOut = json[1];
        const jsonIn = json.length === 2 ? json[1] : json[2];

        test(`${testSuite}/${testCase}`, t => {
            const imported = registry.import(xml);
            t.deepEqual(imported, jsonIn, 'Import XML to JSON');

            const exported = registry.export(json[0], jsonOut)!;
            t.same(exported.toJSON(), xml.toJSON(), 'Export JSON to XML');
            t.end();
        });
    }
}

export default registry;
