// ====================================================================
// XEP-0108: User Activity
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0108.html
// Version: 1.3 (2008-10-29)
// ====================================================================

import {
    childAlternateLanguageText,
    childDoubleEnum,
    childText,
    DefinitionOptions,
    LanguageSet
} from '../../jxt';

import { NS_ACTIVITY } from './namespaces';
import './rfc6120';
import { pubsubItemContentAliases } from './util';
import { PubsubItemContent } from './xep0060';

const GENERAL = [
    'doing_chores',
    'drinking',
    'eating',
    'exercising',
    'grooming',
    'having_appointment',
    'inactive',
    'relaxing',
    'talking',
    'traveling',
    'undefined',
    'working'
];
const SPECIFIC = [
    'at_the_spa',
    'brushing_teeth',
    'buying_groceries',
    'cleaning',
    'coding',
    'commuting',
    'cooking',
    'cycling',
    'cycling',
    'dancing',
    'day_off',
    'doing_maintenance',
    'doing_the_dishes',
    'doing_the_laundry',
    'driving',
    'fishing',
    'gaming',
    'gardening',
    'getting_a_haircut',
    'going_out',
    'hanging_out',
    'having_a_beer',
    'having_a_snack',
    'having_breakfast',
    'having_coffee',
    'having_dinner',
    'having_lunch',
    'having_tea',
    'hiding',
    'hiking',
    'in_a_car',
    'in_a_meeting',
    'in_real_life',
    'jogging',
    'on_a_bus',
    'on_a_plane',
    'on_a_train',
    'on_a_trip',
    'on_the_phone',
    'on_vacation',
    'on_video_phone',
    'other',
    'partying',
    'playing_sports',
    'praying',
    'reading',
    'rehearsing',
    'running',
    'running_an_errand',
    'scheduled_holiday',
    'shaving',
    'shopping',
    'skiing',
    'sleeping',
    'smoking',
    'socializing',
    'studying',
    'sunbathing',
    'swimming',
    'taking_a_bath',
    'taking_a_shower',
    'thinking',
    'walking',
    'walking_the_dog',
    'watching_a_movie',
    'watching_tv',
    'working_out',
    'writing'
];

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
        activity: childDoubleEnum(null, GENERAL, SPECIFIC),
        alternateLanguageText: childAlternateLanguageText(null, 'text'),
        text: childText(null, 'text')
    },
    namespace: NS_ACTIVITY,
    type: NS_ACTIVITY
} as DefinitionOptions;
