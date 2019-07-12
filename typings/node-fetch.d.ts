declare module 'node-fetch' {
    declare const _node_fetch: typeof fetch;
    export default _node_fetch;
}
