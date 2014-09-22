'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Iq = stanza.define({
        name: 'iq',
        namespace: 'jabber:client',
        element: 'iq',
        topLevel: true,
        fields: {
            lang: types.langAttribute(),
            id: types.attribute('id'),
            to: types.jidAttribute('to', true),
            from: types.jidAttribute('from', true),
            type: types.attribute('type')
        }
    });
    
    var toJSON = Iq.prototype.toJSON;
    
    Iq.prototype.toJSON = function () {
        var result = toJSON.call(this);
        result.resultReply = this.resultReply;
        result.errorReply = this.errorReply;
        return result;
    };
    
    Iq.prototype.resultReply = function (data) {
        data = data || {};
        data.to = this.from;
        data.id = this.id;
        data.type = 'result';
        return new Iq(data);
    };
    
    Iq.prototype.errorReply = function (data) {
        data = data || {};
        data.to = this.from;
        data.id = this.id;
        data.type = 'error';
        return new Iq(data);
    };
};
