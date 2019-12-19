import expect from 'expect';
import * as FS from 'fs';

import { parse, Registry, XMLElement } from '../src/jxt';
import XMPP from '../src/protocol';
import { reviveData } from '../src/Utils';

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

        let json: any;
        try {
            json = JSON.parse(
                FS.readFileSync(
                    __dirname + '/protocol-cases/' + testSuite + '/' + testCase + '.json'
                ).toString(),
                reviveData
            );
        } catch (err) {
            console.error(`Failed to parse JSON test case: ${testSuite}/${testCase}`);
        }
        if (!json) {
            break;
        }

        const jsonOut = json[1];
        const jsonIn = json.length === 2 ? json[1] : json[2];

        test(`${testSuite}/${testCase}`, () => {
            const imported = registry.import(xml, { acceptLanguages: ['*'] });
            expect(imported).toStrictEqual(jsonIn);

            const exported = registry.export(json[0], jsonOut, { acceptLanguages: ['*'] })!;
            expect(exported.toJSON()).toStrictEqual(xml.toJSON());
        });
    }
}

export default registry;
