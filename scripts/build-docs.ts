// ////////////////////////////////////////////////////////////////////
//                     UNDER CONSTRUCTION
// --------------------------------------------------------------------
//       The automated doc generation process is still a WIP.
// ////////////////////////////////////////////////////////////////////

// tslint:disable no-nested-template-literals

import { execSync as Child } from 'child_process';
import FS from 'fs';

Child('rimraf ./node_modules/typedoc/node_modules/typescript');
Child('npx typedoc --json ./dist/docs.json --mode file');

// ====================================================================
// Merge Declarations
// --------------------------------------------------------------------
// TypeDoc doesn't merge interface definitions for us when module
// augmentations are used (they get dumped into a standalone group
// instead). So here we'll move everything to the top, and merge things
// with the same name.
// ====================================================================
const docData = JSON.parse(FS.readFileSync('./dist/docs.json').toString());

const KIND_MODULE = 2;
const moduleIds = new Set(docData.groups.filter((g: any) => g.kind === KIND_MODULE)[0].children);
const modules = docData.children.filter((c: any) => moduleIds.has(c.id));
for (const mod of modules) {
    for (const child of mod.children) {
        const parentDef = docData.children.filter((c: any) => c.name === child.name)[0];
        if (!parentDef) {
            docData.children.push(child);
        } else {
            parentDef.children = parentDef.children || [];
            for (const childDef of child.children) {
                parentDef.children.push(childDef);
            }
        }
    }
}
docData.groups = docData.groups.filter((g: any) => g.kind !== KIND_MODULE);
docData.children = docData.children.filter((c: any) => !moduleIds.has(c.id));

FS.writeFileSync('./dist/docs.json', JSON.stringify(docData, null, 4));

function writeType(t: any, wrap = true): string | undefined {
    switch (t.type) {
        case 'intrinsic':
            if (t.name === 'undefined') {
                return;
            }
            return wrap ? `<code>${t.name}</code>` : t.name;
        case 'reference':
            if (t.name.startsWith('Stanzas.')) {
                return wrap ? `<code>${t.name.substr(8)}</code>` : t.name.substr(8);
            }
            return wrap ? `<code>${t.name}</code>` : t.name;
        case 'reflection':
            if (t.declaration.type) {
                return wrap ? `<code>${t.declaration.type}</code>` : t.declaration.type;
            }
            if (t.declaration.signatures) {
                return t.declaration.signatures
                    .map((x: any) => {
                        return `(${(x.parameters || [])
                            .map((p: any) => `${p.name}: ${writeType(p.type, wrap)}`)
                            .join(', ')}) => ${writeType(x.type, wrap)}`;
                    })
                    .filter((x: any) => !!x)
                    .join(' | ');
            }
            if (t.declaration.children) {
                return `{ ${t.declaration.children
                    .map((x: any) => `${x.name}: ${writeType(x.type, false)}`)
                    .join('; ')} }`;
            }
        case 'union':
            return (t.types || [])
                .map((x: any) => writeType(x, wrap))
                .filter((x: any) => !!x)
                .join(' | ');
        case 'intersection':
            return t.types
                .map((x: any) => writeType(x, wrap))
                .filter((x: any) => !!x)
                .join(' & ');
        case 'array':
            return wrap
                ? `<code>${writeType(t.elementType, false)}[]</code>`
                : `${writeType(t.elementType, false)}[]`;
        case 'stringLiteral':
            return wrap ? `<code>${t.value}</code>` : t.value;
        case 'typeParameter':
            return `<${t.name}>`;
        case 'unknown':
            return t.name;
    }
}

// ====================================================================
// Generate API Method Reference
// ====================================================================

const Agent = docData.children.filter((c: any) => c.name === 'Agent')[0];
const agentRef = FS.createWriteStream('./docs/Reference.md');

agentRef.write(`# StanzaJS API Reference

`);
let fields: any[] = Agent.children.sort((a: any, b: any) => {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
});

for (const c of fields) {
    if (c.kindString !== 'Method') {
        continue;
    }
    const meta = c.comment || {};
    const tags = new Map();
    for (const tag of meta.tags || []) {
        tags.set(tag.tag, tag.text.trim());
    }

    agentRef.write(`
<h3 id="${c.name}">${c.name}</h3>

\`\`\`
${c.signatures
    .map((s: any) => writeType({ type: 'reflection', declaration: { signatures: [s] } }, false))
    .join('\n')}
\`\`\`

${(meta.text || '')
    .trim()
    .split(/\n\n+/)
    .map((l: any) => `<p>${l.replace(/\n/g, ' ')}</p>`)
    .join('')}
`);
}
agentRef.write(`</tbody></table>`);
agentRef.close();

// ====================================================================
// Generate Events Reference
// ====================================================================

const AgentEvents = docData.children.filter((c: any) => c.name === 'AgentEvents')[0];
const agentEventsRef = FS.createWriteStream('./docs/Events.md');

agentEventsRef.write(`# StanzaJS Events

Events will eventually be replaced by [Hooks](./Hooks.md). See [HookEmitter](./HookEmitter.md).

Unlike events, hooks are async, and handlers can be chained, running in a definable order.

<hr />
`);
fields = AgentEvents.children.sort((a: any, b: any) => {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
});

for (const c of fields) {
    const meta = c.comment || {};
    const tags = new Map();
    for (const tag of meta.tags || []) {
        tags.set(tag.tag, tag.text.trim());
    }

    agentEventsRef.write(`
<h3 id="${c.name}">${c.name}</h3>

\`\`\`
${writeType(c.type, false)}
\`\`\`

${(meta.text || '')
    .trim()
    .split(/\n\n+/)
    .map((l: any) => `<p>${l.replace(/\n/g, ' ')}</p>`)
    .join('')}
`);
}
agentEventsRef.write(`</tbody></table>`);
agentEventsRef.close();

// ====================================================================
// Generate Hooks Reference
// ====================================================================

const AgentHooks = docData.children.filter((c: any) => c.name === 'AgentHooks')[0];
const agentHooksRef = FS.createWriteStream('./docs/Hooks.md');

agentHooksRef.write(`# StanzaJS Hooks

Hooks are the eventual replacement for [Events](./Events.md). See [HookEmitter](./HookEmitter.md).

Unlike events, hooks are async, and handlers can be chained, running in a definable order.

<hr />

`);
fields = AgentHooks.children.sort((a: any, b: any) => {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
});

for (const c of fields) {
    const meta = c.comment || {};
    const tags = new Map();
    for (const tag of meta.tags || []) {
        tags.set(tag.tag, tag.text.trim());
    }

    agentHooksRef.write(`
<h3 id="${c.name}">${c.name}</h3>

\`\`\`
${writeType(c.type, false)}
\`\`\`

${(meta.text || '')
    .trim()
    .split(/\n\n+/)
    .map((l: any) => `<p>${l.replace(/\n/g, ' ')}</p>`)
    .join('')}
`);
}
agentHooksRef.write(`</tbody></table>`);
agentHooksRef.close();

// ====================================================================
// Generate Config Reference
// ====================================================================

const AgentConfig = docData.children.filter((c: any) => c.name === 'AgentConfig')[0];
const agentConfigRef = FS.createWriteStream('./docs/Configuring.md');

agentConfigRef.write(`# StanzaJS Configuration

Configuring a StanzaJS client is done when calling \`createClient()\`:

\`\`\`typescript
import * as XMPP from 'stanza';

const client = XMPP.createClient({
    // Configuration Settings
});
\`\`\`

It is possible to inspect the configuration later by using \`client.config\`.

## Available Settings

`);
fields = AgentConfig.children.sort((a: any, b: any) => {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
});
agentConfigRef.write(`<ul>`);
for (const c of fields) {
    agentConfigRef.write(`<li><a href="#${c.name}">${c.name}</a></li>`);
}
agentConfigRef.write(`</ul>`);

for (const c of fields) {
    const meta = c.comment || {};
    const tags = new Map();
    for (const tag of meta.tags || []) {
        tags.set(tag.tag, tag.text.trim());
    }

    agentConfigRef.write(`
<h3 id="${c.name}">${meta.shortText || c.name}</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>${c.name}</code></td>
     <td>${writeType(c.type)}</td>
     <td><code>${tags.get('default')}</code></td>
  </tr>
</table>
${(meta.text || '')
    .trim()
    .split(/\n\n+/)
    .map((l: any) => `<p>${l.replace(/\n/g, ' ')}</p>`)
    .join('')}
`);
}
agentConfigRef.close();
