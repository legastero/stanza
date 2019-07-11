const FS = require('fs');
const Child = require('child_process').execSync;

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
const docData = JSON.parse(FS.readFileSync('./dist/docs.json'));

const KIND_MODULE = 2;
const moduleIds = new Set(docData.groups.filter(g => g.kind === KIND_MODULE)[0].children);
const modules = docData.children.filter(c => moduleIds.has(c.id));
for (const mod of modules) {
    for (const child of mod.children) {
        const parentDef = docData.children.filter(c => c.name === child.name)[0];
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
docData.groups = docData.groups.filter(g => g.kind !== KIND_MODULE);
docData.children = docData.children.filter(c => !moduleIds.has(c.id));

FS.writeFileSync('./dist/docs.json', JSON.stringify(docData, null, 4));

function writeType(t, wrap = true) {
    switch (t.type) {
        case 'intrinsic':
            if (t.name === 'undefined') {
                return;
            }
            return wrap ? `<code>${t.name}</code>` : t.name;
        case 'reference':
            return wrap ? `<code>${t.name}</code>` : t.name;
        case 'reflection':
            if (t.declaration.type) {
                return wrap ? `<code>${t.declaration.type}</code>` : t.declaration.type;
            }
            if (t.declaration.signatures) {
                return t.declaration.signatures
                    .map(x => {
                        return `(${x.parameters
                            .map(p => `${p.name}: ${writeType(p.type, wrap)}`)
                            .join(', ')}) => ${writeType(x.type, wrap)}`;
                    })
                    .filter(x => !!x)
                    .join(' | ');
            }
            if (t.declaration.children) {
                return `{ ${t.declaration.children
                    .map(x => `${x.name}: ${writeType(x.type, false)}`)
                    .join('; ')} }`;
            }
        case 'union':
            return t.types
                .map(x => writeType(x, wrap))
                .filter(x => !!x)
                .join(' | ');
        case 'intersection':
            return t.types
                .map(x => writeType(x, wrap))
                .filter(x => !!x)
                .join(' & ');
        case 'array':
            return wrap
                ? `<code>${writeType(t.elementType, false)}[]</code>`
                : `${writeType(t.elementType, false)}[]`;
        case 'stringLiteral':
            return wrap ? `<code>${t.value}</code>` : t.value;
    }
}

// ====================================================================
// Generate API Method Reference
// ====================================================================

const Agent = docData.children.filter(c => c.name === 'Agent')[0];

// ====================================================================
// Generate Events Reference
// ====================================================================

const AgentEvents = docData.children.filter(c => c.name === 'AgentEvents')[0];
const agentEventsRef = FS.createWriteStream('./docs/Events.md');

agentEventsRef.write(`# StanzaJS Events

`);
let fields = AgentEvents.children.sort((a, b) => {
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
\`\`\`typescript
${writeType(c.type, false)}
\`\`\`

${(meta.text || '')
    .trim()
    .split(/\n\n+/)
    .map(l => `<p>${l.replace(/\n/g, ' ')}</p>`)
    .join('')}
`);
}
agentEventsRef.write(`</tbody></table>`);
agentEventsRef.close();

// ====================================================================
// Generate Config Reference
// ====================================================================

const AgentConfig = docData.children.filter(c => c.name === 'AgentConfig')[0];
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
fields = AgentConfig.children.sort((a, b) => {
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
     <td><code>${tags.get('default', undefined)}</code></td>
  </tr>
</table>
${(meta.text || '')
    .trim()
    .split(/\n\n+/)
    .map(l => `<p>${l.replace(/\n/g, ' ')}</p>`)
    .join('')}
`);
}
agentConfigRef.close();
