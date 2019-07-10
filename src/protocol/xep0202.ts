// ====================================================================
// XEP-0202: Entity Time
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0202.html
// Version: 2.0 (2009-09-15)
// ====================================================================

import { childDate, childTimezoneOffset, DefinitionOptions } from '../jxt';

import { NS_TIME } from '../Namespaces';

declare module './' {
    export interface IQPayload {
        time?: EntityTime;
    }
}

export interface EntityTime {
    utc?: Date;
    tzo?: number;
}

const Protocol: DefinitionOptions = {
    element: 'time',
    fields: {
        tzo: childTimezoneOffset(null, 'tzo'),
        utc: childDate(null, 'utc')
    },
    namespace: NS_TIME,
    path: 'iq.time'
};
export default Protocol;
