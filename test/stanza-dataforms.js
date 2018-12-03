import jxt from 'jxt';
import { JID } from 'xmpp-jid';
import * as fs from 'fs';
import test from 'tape';

const JXT = jxt.createRegistry();

JXT.use(require('../src/protocol').default);

const DataForm = JXT.getDefinition('x', 'jabber:x:data');

const formXML = fs.readFileSync(__dirname + '/samples/dataform-1.xml');
const submittedXML = fs.readFileSync(__dirname + '/samples/dataform-2.xml');
const itemsXML = fs.readFileSync(__dirname + '/samples/dataform-3.xml');
const validationXML = fs.readFileSync(__dirname + '/samples/dataform-4.xml');
const mediaXML = fs.readFileSync(__dirname + '/samples/dataform-5.xml');
const layoutXML = fs.readFileSync(__dirname + '/samples/dataform-6.xml');
const nestedLayoutXML = fs.readFileSync(__dirname + '/samples/dataform-7.xml');

test('Convert Form XML to Data Form object', function(t) {
    const form = JXT.parse(formXML, DataForm).toJSON();

    t.equal(form.type, 'form');
    t.equal(form.title, 'Bot Configuration');
    t.same(form.instructions, ['Fill out this form to configure your new bot!']);
    t.equal(form.fields.length, 12);

    t.same(form.fields[0], {
        name: 'FORM_TYPE',
        type: 'hidden',
        value: ['jabber:bot']
    });

    t.same(form.fields[1], {
        type: 'fixed',
        value: ['Section 1: Bot Info']
    });

    t.same(form.fields[2], {
        label: 'The name of your bot',
        name: 'botname',
        type: 'text-single'
    });

    t.same(form.fields[3], {
        label: 'Helpful description of your bot',
        name: 'description',
        type: 'text-multi'
    });

    t.same(form.fields[4], {
        label: 'Public bot?',
        name: 'public',
        required: true,
        type: 'boolean'
    });

    t.same(form.fields[5], {
        label: 'Password for special access',
        name: 'password',
        type: 'text-private'
    });

    t.same(form.fields[6], {
        type: 'fixed',
        value: ['Section 2: Features']
    });

    t.same(form.fields[7], {
        label: 'What features will the bot support?',
        name: 'features',
        options: [
            {
                label: 'Contests',
                value: 'contests'
            },
            {
                label: 'News',
                value: 'news'
            },
            {
                label: 'Polls',
                value: 'polls'
            },
            {
                label: 'Reminders',
                value: 'reminders'
            },
            {
                label: 'Search',
                value: 'search'
            }
        ],
        type: 'list-multi',
        value: ['news', 'search']
    });

    t.same(form.fields[8], {
        type: 'fixed',
        value: ['Section 3: Subscriber List']
    });

    t.same(form.fields[9], {
        label: 'Maximum number of subscribers',
        name: 'maxsubs',
        options: [
            {
                label: '10',
                value: '10'
            },
            {
                label: '20',
                value: '20'
            },
            {
                label: '30',
                value: '30'
            },
            {
                label: '50',
                value: '50'
            },
            {
                label: '100',
                value: '100'
            },
            {
                label: 'None',
                value: 'none'
            }
        ],
        type: 'list-single',
        value: '20'
    });

    t.same(form.fields[10], {
        type: 'fixed',
        value: ['Section 4: Invitations']
    });

    t.same(form.fields[11], {
        desc: 'Tell all your friends about your new bot!',
        label: 'People to invite',
        name: 'invitelist',
        type: 'jid-multi'
    });

    t.end();
});

test('Convert Form Submission Results XML to Data Form object', function(t) {
    let form = JXT.parse(submittedXML, DataForm).toJSON();

    // Clients are required to send the type attribute back when
    // submitting forms, so we have to apply the type values back
    // if we want values cast properly.
    const fieldTypes = {
        FORM_TYPE: 'hidden',
        botname: 'text-single',
        description: 'text-multi',
        features: 'list-multi',
        invitelist: 'jid-multi',
        maxsubs: 'list-single',
        password: 'text-private',
        public: 'boolean'
    };
    for (let i = 0; i < form.fields.length; i++) {
        form.fields[i].type = fieldTypes[form.fields[i].name];
    }
    form = new DataForm(form).toJSON();

    t.equal(form.type, 'submit');
    t.equal(form.fields.length, 8);

    t.same(form.fields[0], {
        name: 'FORM_TYPE',
        type: 'hidden',
        value: ['jabber:bot']
    });

    t.same(form.fields[1], {
        name: 'botname',
        type: 'text-single',
        value: 'The Jabber Google Bot'
    });

    t.same(form.fields[2], {
        name: 'description',
        type: 'text-multi',
        value:
            'This bot enables you to send requests to\n' +
            'Google and receive the search results right\n' +
            "in your Jabber client. It's really cool!\n" +
            'It even supports Google News!'
    });

    t.same(form.fields[3], {
        name: 'public',
        type: 'boolean'
    });
    t.ok(!form.fields[3].value);

    t.same(form.fields[4], {
        name: 'password',
        type: 'text-private',
        value: 'v3r0na'
    });

    t.same(form.fields[5], {
        name: 'features',
        type: 'list-multi',
        value: ['news', 'search']
    });

    t.same(form.fields[6], {
        name: 'maxsubs',
        type: 'list-single',
        value: '50'
    });

    t.same(form.fields[7], {
        name: 'invitelist',
        type: 'jid-multi',
        value: [new JID('juliet@capulet.com'), new JID('benvolio@montague.net')]
    });

    t.end();
});

test('Convert Form Item Results XML to Data Form object', function(t) {
    const form = JXT.parse(itemsXML, DataForm).toJSON();

    t.equal(form.type, 'result');
    t.equal(form.title, 'Joogle Search: verona');
    t.equal(form.reportedFields.length, 3);
    t.equal(form.items.length, 5);

    t.same(form.reportedFields, [
        { name: 'name', type: 'text-single' },
        { name: 'url', type: 'text-single' },
        { name: 'recommended', type: 'boolean' }
    ]);

    t.same(form.items[0].fields, [
        {
            name: 'name',
            type: 'text-single',
            value: 'Comune di Verona - Benvenuti nel sito ufficiale'
        },
        {
            name: 'url',
            type: 'text-single',
            value: 'http://www.comune.verona.it/'
        },
        {
            name: 'recommended',
            type: 'boolean',
            value: true
        }
    ]);

    t.end();
});

test('Convert Form with Validation XML to Data Form object', function(t) {
    const form = JXT.parse(validationXML, DataForm).toJSON();

    t.equal(form.fields.length, 5);

    t.same(form.fields[0], {
        label: 'Event Date/Time',
        name: 'evt.date',
        type: 'text-single',
        validation: {
            basic: true,
            dataType: 'xs:dateTime'
        },
        value: '2003-10-06T11:22:00-07:00'
    });

    t.same(form.fields[1], {
        label: 'Event Category',
        name: 'evt.category',
        options: [
            {
                value: 'holiday'
            },
            {
                value: 'reminder'
            },
            {
                value: 'appointment'
            }
        ],
        type: 'list-single',
        validation: {
            dataType: 'xs:string',
            open: true
        }
    });

    t.same(form.fields[2], {
        label: 'RSVP Date/Time',
        name: 'evt.rsvp',
        type: 'text-single',
        validation: {
            dataType: 'xs:dateTime',
            range: {
                max: '2003-10-24T23:59:59-07:00',
                min: '2003-10-05T00:00:00-07:00'
            }
        },
        value: '2003-10-06T11:22:00-07:00'
    });

    t.same(form.fields[3], {
        desc: "This field should be your SSN, including '-' (e.g. 123-12-1234)",
        label: 'Social Security Number',
        name: 'ssn',
        type: 'text-single',
        validation: {
            dataType: 'xs:string',
            regex: '([0-9]{3})-([0-9]{2})-([0-9]{4})'
        }
    });

    t.same(form.fields[4], {
        label: 'Notify me by',
        name: 'evt.notify-methods',
        options: [
            {
                value: 'e-mail'
            },
            {
                value: 'jabber/xmpp'
            },
            {
                value: 'work phone'
            },
            {
                value: 'home phone'
            },
            {
                value: 'cell phone'
            }
        ],
        type: 'list-multi',
        validation: {
            basic: true,
            dataType: 'xs:string',
            select: {
                max: 3,
                min: 1
            }
        }
    });

    t.end();
});

test('Convert Form with Media Field XML to Data Form object', function(t) {
    const form = JXT.parse(mediaXML, DataForm).toJSON();

    t.equal(form.fields.length, 1);

    t.same(form.fields[0], {
        media: {
            height: 80,
            uris: [
                {
                    type: 'image/jpeg',
                    uri: 'http://www.victim.example/challenges/ocr.jpeg?F3A6292C'
                },
                {
                    type: 'image/jpeg',
                    uri: 'cid:sha1+f24030b8d91d233bac14777be5ab531ca3b9f102@bob.xmpp.org'
                }
            ],
            width: 290
        },
        name: 'ocr',
        type: 'text-single'
    });

    t.end();
});

test('Form layout', function(t) {
    const form = JXT.parse(layoutXML, DataForm).toJSON();

    t.same(form.layout, [
        {
            contents: [
                {
                    text: 'This is page one of three.'
                },
                {
                    text:
                        'Note: In accordance with the XSF privacy policy, your personal information will never be shared outside the organization in any way for any purpose; however, your name and JID may be published in the XSF membership directory.'
                },
                {
                    field: 'name.first'
                },
                {
                    field: 'name.last'
                },
                {
                    field: 'email'
                },
                {
                    field: 'jid'
                },
                {
                    field: 'background'
                }
            ],
            label: 'Personal Information'
        },
        {
            contents: [
                {
                    text: 'This is page two of three.'
                },
                {
                    text:
                        "We use this page to gather information about any XEPs you've worked on, as well as your mailing list activity."
                },
                {
                    text: "You do post to the mailing lists, don't you?"
                },
                {
                    field: 'activity.mailing-lists'
                },
                {
                    field: 'activity.xeps'
                }
            ],
            label: 'Community Activity'
        },
        {
            contents: [
                {
                    text: 'This is page three of three.'
                },
                {
                    text: "You're almost done!"
                },
                {
                    text:
                        'This is where you describe your future plans and why you think you deserve to be a member of the XMPP Standards Foundation.'
                },
                {
                    field: 'future'
                },
                {
                    field: 'reasoning'
                }
            ],
            label: 'Plans and Reasonings'
        }
    ]);

    t.end();
});

test('Form layout with nested sections', function(t) {
    const form = JXT.parse(nestedLayoutXML, DataForm).toJSON();

    t.same(form.layout, [
        {
            contents: [
                {
                    section: {
                        contents: [
                            {
                                text:
                                    'Note: In accordance with the XSF privacy policy, your personal information will never be shared outside the organization in any way for any purpose; however, your name and JID may be published in the XSF membership directory.'
                            },
                            {
                                section: {
                                    contents: [
                                        {
                                            text: 'Who are you?'
                                        },
                                        {
                                            field: 'name.first'
                                        },
                                        {
                                            field: 'name.last'
                                        }
                                    ],
                                    label: 'Name'
                                }
                            },
                            {
                                section: {
                                    contents: [
                                        {
                                            text: 'How can we contact you?'
                                        },
                                        {
                                            field: 'email'
                                        },
                                        {
                                            field: 'jid'
                                        }
                                    ],
                                    label: 'Contact Information'
                                }
                            },
                            {
                                field: 'background'
                            }
                        ],
                        label: 'Personal Information'
                    }
                },
                {
                    section: {
                        contents: [
                            {
                                text:
                                    "We use this page to gather information about any XEPs you've worked on, as well as your mailing list activity."
                            },
                            {
                                text: "You do post to the mailing lists, don't you?"
                            },
                            {
                                field: 'activity.mailing-lists'
                            },
                            {
                                field: 'activity.xeps'
                            }
                        ],
                        label: 'Community Activity'
                    }
                },
                {
                    section: {
                        contents: [
                            {
                                text:
                                    'This is where you describe your future plans and why you think you deserve to be a member of the XMPP Standards Foundation.'
                            },
                            {
                                field: 'future'
                            },
                            {
                                field: 'reasoning'
                            }
                        ],
                        label: 'Plans and Reasonings'
                    }
                }
            ]
        }
    ]);

    t.end();
});
