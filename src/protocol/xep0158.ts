// ====================================================================
// XEP-0158: CAPTCHA Forms
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0158.html
// Version: 1.0 (2008-09-03)
// ====================================================================

import { DefinitionOptions, splicePath } from '../jxt';

import { NS_CAPTCHA } from './Namespaces';
import { extendIQ, extendMessage } from './util';
import { DataForm } from './xep0004';

declare module './' {
    export interface Message {
        captcha?: DataForm;
    }
    export interface IQ {
        captcha?: DataForm;
    }
}

export default [
    extendMessage({
        captcha: splicePath(NS_CAPTCHA, 'captcha', 'dataform')
    }),
    extendIQ({
        captcha: splicePath(NS_CAPTCHA, 'captcha', 'dataform')
    })
];
