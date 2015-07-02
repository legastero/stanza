var fs = require('fs');
var jxt = require('jxt').createRegistry();
var test = require('tape');
var JID = require('xmpp-jid').JID;

jxt.use(require('jxt-xmpp-types'));
jxt.use(require('jxt-xmpp'));

var DataForm = jxt.getDefinition('x', 'jabber:x:data');


var formXML = fs.readFileSync(__dirname + '/samples/dataform-1.xml');
var submittedXML = fs.readFileSync(__dirname + '/samples/dataform-2.xml');
var itemsXML = fs.readFileSync(__dirname + '/samples/dataform-3.xml');
var validationXML = fs.readFileSync(__dirname + '/samples/dataform-4.xml');
var mediaXML = fs.readFileSync(__dirname + '/samples/dataform-5.xml');
var layoutXML = fs.readFileSync(__dirname + '/samples/dataform-6.xml');
var nestedLayoutXML = fs.readFileSync(__dirname + '/samples/dataform-7.xml');


test('Convert Form XML to Data Form object', function (t) {
    var form = jxt.parse(formXML, DataForm).toJSON();

    t.equal(form.type, 'form');
    t.equal(form.title, 'Bot Configuration');
    t.same(form.instructions, ['Fill out this form to configure your new bot!']);
    t.equal(form.fields.length, 12);

    t.same(form.fields[0], {
        type: 'hidden',
        name: 'FORM_TYPE',
        value: ['jabber:bot']
    });

    t.same(form.fields[1], {
        type: 'fixed',
        value: ['Section 1: Bot Info']
    });

    t.same(form.fields[2], {
        type: 'text-single',
        name: 'botname',
        label: 'The name of your bot'
    });

    t.same(form.fields[3], {
        type: 'text-multi',
        name: 'description',
        label: 'Helpful description of your bot'
    });

    t.same(form.fields[4], {
        type: 'boolean',
        name: 'public',
        label: 'Public bot?',
        required: true
    });

    t.same(form.fields[5], {
        type: 'text-private',
        name: 'password',
        label: 'Password for special access'
    });

    t.same(form.fields[6], {
        type: 'fixed',
        value: ['Section 2: Features']
    });

    t.same(form.fields[7], {
        type: 'list-multi',
        name: 'features',
        label: 'What features will the bot support?',
        options: [
            { label: 'Contests', value: 'contests' },
            { label: 'News', value: 'news' },
            { label: 'Polls', value: 'polls' },
            { label: 'Reminders', value: 'reminders' },
            { label: 'Search', value: 'search' }
        ],
        value: ['news', 'search']
    });

    t.same(form.fields[8], {
        type: 'fixed',
        value: ['Section 3: Subscriber List']
    });

    t.same(form.fields[9], {
        type: 'list-single',
        name: 'maxsubs',
        label: 'Maximum number of subscribers',
        options: [
            { label: '10', value: '10' },
            { label: '20', value: '20' },
            { label: '30', value: '30' },
            { label: '50', value: '50' },
            { label: '100', value: '100' },
            { label: 'None', value: 'none' }
        ],
        value: '20'
    });

    t.same(form.fields[10], {
        type: 'fixed',
        value: ['Section 4: Invitations']
    });

    t.same(form.fields[11], {
        type: 'jid-multi',
        name: 'invitelist',
        label: 'People to invite',
        desc: 'Tell all your friends about your new bot!'
    });

    t.end();
});

test('Convert Form Submission Results XML to Data Form object', function (t) {
    var form = jxt.parse(submittedXML, DataForm).toJSON();

    // Clients are required to send the type attribute back when
    // submitting forms, so we have to apply the type values back
    // if we want values cast properly.
    var fieldTypes = {
        'FORM_TYPE': 'hidden',
        'botname': 'text-single',
        'description': 'text-multi',
        'public': 'boolean',
        'password': 'text-private',
        'features': 'list-multi',
        'maxsubs': 'list-single',
        'invitelist': 'jid-multi'
    };
    for (var i = 0; i < form.fields.length; i++) {
        form.fields[i].type = fieldTypes[form.fields[i].name];
    }
    form = new DataForm(form).toJSON();


    t.equal(form.type, 'submit');
    t.equal(form.fields.length, 8);

    t.same(form.fields[0], {
        type: 'hidden',
        name: 'FORM_TYPE',
        value: ['jabber:bot']
    });

    t.same(form.fields[1], {
        type: 'text-single',
        name: 'botname',
        value: 'The Jabber Google Bot'
    });

    t.same(form.fields[2], {
        type: 'text-multi',
        name: 'description',
        value: 'This bot enables you to send requests to\n' +
               'Google and receive the search results right\n' +
               'in your Jabber client. It\'s really cool!\n' +
               'It even supports Google News!'
    });

    t.same(form.fields[3], {
        type: 'boolean',
        name: 'public'
    });
    t.ok(!form.fields[3].value);

    t.same(form.fields[4], {
        type: 'text-private',
        name: 'password',
        value: 'v3r0na'
    });

    t.same(form.fields[5], {
        type: 'list-multi',
        name: 'features',
        value: ['news', 'search']
    });

    t.same(form.fields[6], {
        type: 'list-single',
        name: 'maxsubs',
        value: '50'
    });

    t.same(form.fields[7], {
        type: 'jid-multi',
        name: 'invitelist',
        value: [
            new JID('juliet@capulet.com').toJSON(),
            new JID('benvolio@montague.net').toJSON()
        ]
    });

    t.end();
});


test('Convert Form Item Results XML to Data Form object', function (t) {
    var form = jxt.parse(itemsXML, DataForm).toJSON();

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
            value: 'Comune di Verona - Benvenuti nel sito ufficiale',
            type: 'text-single'
        },
        {
            name: 'url',
            value: 'http://www.comune.verona.it/',
            type: 'text-single'
        },
        {
            name: 'recommended',
            value: true,
            type: 'boolean',
        }
    ]);

    t.end();
});


test('Convert Form with Validation XML to Data Form object', function (t) {
    var form = jxt.parse(validationXML, DataForm).toJSON();

    t.equal(form.fields.length, 5);

    t.same(form.fields[0], {
        type: 'text-single',
        name: 'evt.date',
        label: 'Event Date/Time',
        value: '2003-10-06T11:22:00-07:00',
        validation: {
            dataType: 'xs:dateTime',
            basic: true
        }
    });

    t.same(form.fields[1], {
        type: 'list-single',
        name: 'evt.category',
        label: 'Event Category',
        options: [
            { value: 'holiday' },
            { value: 'reminder' },
            { value: 'appointment' }
        ],
        validation: {
            dataType: 'xs:string',
            open: true
        }
    });

    t.same(form.fields[2], {
        type: 'text-single',
        name: 'evt.rsvp',
        label: 'RSVP Date/Time',
        value: '2003-10-06T11:22:00-07:00',
        validation: {
            dataType: 'xs:dateTime',
            range: {
                min: '2003-10-05T00:00:00-07:00',
                max: '2003-10-24T23:59:59-07:00'
            }
        }
    });

    t.same(form.fields[3], {
        type: 'text-single',
        name: 'ssn',
        label: 'Social Security Number',
        desc: 'This field should be your SSN, including \'-\' (e.g. 123-12-1234)',
        validation: {
            dataType: 'xs:string',
            regex: '([0-9]{3})-([0-9]{2})-([0-9]{4})'
        }
    });

    t.same(form.fields[4], {
        type: 'list-multi',
        name: 'evt.notify-methods',
        label: 'Notify me by',
        options: [
            { value: 'e-mail' },
            { value: 'jabber/xmpp' },
            { value: 'work phone' },
            { value: 'home phone' },
            { value: 'cell phone' }
        ],
        validation: {
            dataType: 'xs:string',
            basic: true,
            select: {
                min: 1,
                max: 3
            }
        }
    });

    t.end();
});


test('Convert Form with Media Field XML to Data Form object', function (t) {
    var form = jxt.parse(mediaXML, DataForm).toJSON();

    t.equal(form.fields.length, 1);

    t.same(form.fields[0], {
        type: 'text-single',
        name: 'ocr',
        media: {
            height: 80,
            width: 290,
            uris: [
                {
                    type: 'image/jpeg',
                    uri: 'http://www.victim.example/challenges/ocr.jpeg?F3A6292C'
                },
                {
                    type: 'image/jpeg',
                    uri: 'cid:sha1+f24030b8d91d233bac14777be5ab531ca3b9f102@bob.xmpp.org'
                }
            ]
        }
    });

    t.end();
});


test('Form layout', function (t) {
    var form = jxt.parse(layoutXML, DataForm).toJSON();

    t.same(form.layout, [
        {
            label: 'Personal Information',
            contents: [
                {text: 'This is page one of three.'},
                {text: 'Note: In accordance with the XSF privacy policy, your personal information will never be shared outside the organization in any way for any purpose; however, your name and JID may be published in the XSF membership directory.'},
                {field: 'name.first'},
                {field: 'name.last'},
                {field: 'email'},
                {field: 'jid'},
                {field: 'background'},
            ]
        },
        {
            label: 'Community Activity',
            contents: [
                {text: 'This is page two of three.'},
                {text: 'We use this page to gather information about any XEPs you\'ve worked on, as well as your mailing list activity.'},
                {text: 'You do post to the mailing lists, don\'t you?'},
                {field: 'activity.mailing-lists'},
                {field: 'activity.xeps'}
            ]
        },
        {
            label: 'Plans and Reasonings',
            contents: [
                {text: 'This is page three of three.'},
                {text: 'You\'re almost done!'},
                {text: 'This is where you describe your future plans and why you think you deserve to be a member of the XMPP Standards Foundation.'},
                {field: 'future'},
                {field: 'reasoning'}
            ]
        }
    ]);

    t.end();
});


test('Form layout with nested sections', function (t) {
    var form = jxt.parse(nestedLayoutXML, DataForm).toJSON();

    t.same(form.layout, [
        {
            contents: [
                {
                    section: {
                        label: 'Personal Information',
                        contents: [
                            {text: 'Note: In accordance with the XSF privacy policy, your personal information will never be shared outside the organization in any way for any purpose; however, your name and JID may be published in the XSF membership directory.'},
                            {section: {
                                label: 'Name',
                                contents: [
                                    {text: 'Who are you?'},
                                    {field: 'name.first'},
                                    {field: 'name.last'}
                                ]
                            }},
                            {section: {
                                label: 'Contact Information',
                                contents: [
                                    {text: 'How can we contact you?'},
                                    {field: 'email'},
                                    {field: 'jid'}
                                ]
                            }},
                            {field: 'background'},
                        ]
                    }
                },
                {
                    section: {
                        label: 'Community Activity',
                        contents: [
                            {text: 'We use this page to gather information about any XEPs you\'ve worked on, as well as your mailing list activity.'},
                            {text: 'You do post to the mailing lists, don\'t you?'},
                            {field: 'activity.mailing-lists'},
                            {field: 'activity.xeps'}
                        ]
                    },
                },
                {
                    section: {
                        label: 'Plans and Reasonings',
                        contents: [
                            {text: 'This is where you describe your future plans and why you think you deserve to be a member of the XMPP Standards Foundation.'},
                            {field: 'future'},
                            {field: 'reasoning'}
                        ]
                    }
                }
            ]
        }
    ]);

    t.end();
});
