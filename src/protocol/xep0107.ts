// ====================================================================
// XEP-0107: User Mood
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0107.html
// Version: 1.2.1 (2018-03-13)
// ====================================================================

import { USER_MOODS } from '../Constants';
import {
    childAlternateLanguageText,
    childEnum,
    childText,
    DefinitionOptions,
    LanguageSet
} from '../jxt';

import { NS_MOOD } from '../Namespaces';

import { PubsubItemContent } from './';
import { pubsubItemContentAliases } from './util';

declare module './' {
    export interface Message {
        mood?: UserMood;
    }
}

export interface UserMood extends PubsubItemContent {
    itemType?: typeof NS_MOOD;
    value?: string;
    text?: string;
    alternateLanguageText?: LanguageSet<string>;
}

export default {
    aliases: [{ path: 'message.mood', impliedType: true }, ...pubsubItemContentAliases()],
    element: 'mood',
    fields: {
        alternateLanguageText: childAlternateLanguageText(null, 'text'),
        text: childText(null, 'text'),
        value: childEnum(null, USER_MOODS)
    },
    namespace: NS_MOOD,
    type: NS_MOOD
} as DefinitionOptions;
