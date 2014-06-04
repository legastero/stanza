var fs = require('fs');
var jxt = require('jxt');
var test = require('tape');
var dataforms = require('../lib/stanza/dataforms');
var JID = require('../lib/jid');

var DataForm = dataforms.DataForm;

var formXML = fs.readFileSync(__dirname + '/samples/dataform-1.xml');
var submittedXML = fs.readFileSync(__dirname + '/samples/dataform-2.xml');
var itemsXML = fs.readFileSync(__dirname + '/samples/dataform-3.xml');


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
