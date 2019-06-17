// ====================================================================
// XEP-0107: User Mood
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0107.html
// Version: 1.2.1 (2018-03-13)
// ====================================================================

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

const MOODS = [
    'afraid',
    'amazed',
    'amorous',
    'angry',
    'annoyed',
    'anxious',
    'aroused',
    'ashamed',
    'bored',
    'brave',
    'calm',
    'cautious',
    'cold',
    'confident',
    'confused',
    'contemplative',
    'contented',
    'cranky',
    'crazy',
    'creative',
    'curious',
    'dejected',
    'depressed',
    'disappointed',
    'disgusted',
    'dismayed',
    'distracted',
    'embarrassed',
    'envious',
    'excited',
    'flirtatious',
    'frustrated',
    'grateful',
    'grieving',
    'grumpy',
    'guilty',
    'happy',
    'hopeful',
    'hot',
    'humbled',
    'humiliated',
    'hungry',
    'hurt',
    'impressed',
    'in_awe',
    'in_love',
    'indignant',
    'interested',
    'intoxicated',
    'invincible',
    'jealous',
    'lonely',
    'lost',
    'lucky',
    'mean',
    'moody',
    'nervous',
    'neutral',
    'offended',
    'outraged',
    'playful',
    'proud',
    'relaxed',
    'relieved',
    'remorseful',
    'restless',
    'sad',
    'sarcastic',
    'satisfied',
    'serious',
    'shocked',
    'shy',
    'sick',
    'sleepy',
    'spontaneous',
    'stressed',
    'strong',
    'surprised',
    'thankful',
    'thirsty',
    'tired',
    'undefined',
    'weak',
    'worried'
];

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
        value: childEnum(null, MOODS)
    },
    namespace: NS_MOOD,
    type: NS_MOOD
} as DefinitionOptions;
