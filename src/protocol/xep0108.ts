// ====================================================================
// XEP-0108: User Activity
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0108.html
// Version: 1.3 (2008-10-29)
// ====================================================================

import { USER_ACTIVITY_GENERAL, USER_ACTIVITY_SPECIFIC } from '../Constants';
import {
    childAlternateLanguageText,
    childDoubleEnum,
    childText,
    DefinitionOptions,
    LanguageSet
} from '../jxt';
import { NS_ACTIVITY } from '../Namespaces';

import { PubsubItemContent } from './';
import { pubsubItemContentAliases } from './util';

export interface UserActivity extends PubsubItemContent {
    itemType?: typeof NS_ACTIVITY;
    activity: [string] | [string, string];
    text?: string;
    alternateLanguageText?: LanguageSet<string>;
}

export default {
    aliases: [{ path: 'activity', impliedType: true }, ...pubsubItemContentAliases()],
    element: 'activity',
    fields: {
        activity: childDoubleEnum(null, USER_ACTIVITY_GENERAL, USER_ACTIVITY_SPECIFIC),
        alternateLanguageText: childAlternateLanguageText(null, 'text'),
        text: childText(null, 'text')
    },
    namespace: NS_ACTIVITY,
    type: NS_ACTIVITY
} as DefinitionOptions;
