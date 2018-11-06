import * as NS from './namespaces';

const VERSION = {
    client: NS.CLIENT,
    server: NS.SERVER,
    component: NS.COMPONENT
};

export default function(JXT) {
    // ----------------------------------------------------------------
    // Shortcuts for common extension calls
    // ----------------------------------------------------------------

    JXT.extendMessage = function(JXTClass, multiName) {
        this.withMessage(Message => {
            this.extend(Message, JXTClass, multiName);
        });
    };

    JXT.extendPresence = function(JXTClass, multiName) {
        this.withPresence(Presence => {
            this.extend(Presence, JXTClass, multiName);
        });
    };

    JXT.extendIQ = function(JXTClass, multiName) {
        this.withIQ(IQ => {
            this.extend(IQ, JXTClass, multiName);
        });
    };

    JXT.extendStreamFeatures = function(JXTClass) {
        this.withStreamFeatures(StreamFeatures => {
            this.extend(StreamFeatures, JXTClass);
        });
    };

    JXT.extendPubsubItem = function(JXTClass) {
        this.withPubsubItem(PubsubItem => {
            this.extend(PubsubItem, JXTClass);
        });
    };

    // ----------------------------------------------------------------
    // Shortcuts for common withDefinition calls
    // ----------------------------------------------------------------

    JXT.withIQ = function(cb) {
        this.withDefinition('iq', NS.CLIENT, cb);
        this.withDefinition('iq', NS.COMPONENT, cb);
    };

    JXT.withMessage = function(cb) {
        this.withDefinition('message', NS.CLIENT, cb);
        this.withDefinition('message', NS.COMPONENT, cb);
    };

    JXT.withPresence = function(cb) {
        this.withDefinition('presence', NS.CLIENT, cb);
        this.withDefinition('presence', NS.COMPONENT, cb);
    };

    JXT.withStreamFeatures = function(cb) {
        this.withDefinition('features', NS.STREAM, cb);
    };

    JXT.withStanzaError = function(cb) {
        this.withDefinition('error', NS.CLIENT, cb);
        this.withDefinition('error', NS.COMPONENT, cb);
    };

    JXT.withDataForm = function(cb) {
        this.withDefinition('x', NS.DATAFORM, cb);
    };

    JXT.withPubsubItem = function(cb) {
        this.withDefinition('item', NS.PUBSUB, cb);
        this.withDefinition('item', NS.PUBSUB_EVENT, cb);
    };

    // ----------------------------------------------------------------
    // Shortcuts for common getDefinition calls
    // ----------------------------------------------------------------

    JXT.getMessage = function(version = 'client') {
        return this.getDefinition('message', VERSION[version]);
    };

    JXT.getPresence = function(version = 'client') {
        return this.getDefinition('presence', VERSION[version]);
    };

    JXT.getIQ = function(version = 'client') {
        return this.getDefinition('iq', VERSION[version]);
    };

    JXT.getStreamError = function() {
        return this.getDefinition('error', NS.STREAM);
    };

    // For backward compatibility
    JXT.getIq = JXT.getIQ;
    JXT.withIq = JXT.withIQ;
}
