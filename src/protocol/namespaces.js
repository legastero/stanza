// ================================================================
// RFCS
// ================================================================

// RFC 6120
export const BIND = 'urn:ietf:params:xml:ns:xmpp-bind';
export const CLIENT = 'jabber:client';
export const SASL = 'urn:ietf:params:xml:ns:xmpp-sasl';
export const SERVER = 'jabber:server';
export const SESSION = 'urn:ietf:params:xml:ns:xmpp-session';
export const STANZA_ERROR = 'urn:ietf:params:xml:ns:xmpp-stanzas';
export const STREAM = 'http://etherx.jabber.org/streams';
export const STREAM_ERROR = 'urn:ietf:params:xml:ns:xmpp-streams';

// RFC 6121
export const ROSTER = 'jabber:iq:roster';
export const ROSTER_VERSIONING = 'urn:xmpp:features:rosterver';
export const SUBSCRIPTION_PREAPPROVAL = 'urn:xmpp:features:pre-approval';

// RFC 7395
export const FRAMING = 'urn:ietf:params:xml:ns:xmpp-framing';

// ================================================================
// XEPS
// ================================================================


// XEP-0004
export const DATAFORM = 'jabber:x:data';

// XEP-0009
export const RPC = 'jabber:iq:rpc';

// XEP-0012
export const LAST_ACTIVITY = 'jabber:iq:last';

// XEP-0016
export const PRIVACY = 'jabber:iq:privacy';

// XEP-0030
export const DISCO_INFO = 'http://jabber.org/protocol/disco#info';
export const DISCO_ITEMS = 'http://jabber.org/protocol/disco#items';

// XEP-0033
export const ADDRESS = 'http://jabber.org/protocol/address';

// XEP-0045
export const MUC = 'http://jabber.org/protocol/muc';
export const MUC_ADMIN = 'http://jabber.org/protocol/muc#admin';
export const MUC_OWNER = 'http://jabber.org/protocol/muc#owner';
export const MUC_USER = 'http://jabber.org/protocol/muc#user';

// XEP-0047
export const IBB = 'http://jabber.org/protocol/ibb';

// XEP-0048
export const BOOKMARKS = 'storage:bookmarks';

// XEP-0049
export const PRIVATE = 'jabber:iq:private';

// XEP-0050
export const ADHOC_COMMANDS = 'http://jabber.org/protocol/commands';

// XEP-0054
export const VCARD_TEMP = 'vcard-temp';

// XEP-0055
export const SEARCH = 'jabber:iq:search';

// XEP-0059
export const RSM = 'http://jabber.org/protocol/rsm';

// XEP-0060
export const PUBSUB = 'http://jabber.org/protocol/pubsub';
export const PUBSUB_ERRORS = 'http://jabber.org/protocol/pubsub#errors';
export const PUBSUB_EVENT = 'http://jabber.org/protocol/pubsub#event';
export const PUBSUB_OWNER = 'http://jabber.org/protocol/pubsub#owner';

// XEP-0065
export const SOCKS5 = 'http://jabber.org/protocol/bytestreams';

// XEP-0066
export const OOB_IQ = 'jabber:iq:oob';
export const OOB = 'jabber:x:oob';

// XEP-0070
export const HTTP_AUTH = 'http://jabber.org/protocol/http-auth';

// XEP-0071
export const XHTML_IM = 'http://jabber.org/protocol/xhtml-im';

// XEP-0077
export const REGISTER = 'jabber:iq:register';

// XEP-0079
export const AMP = 'http://jabber.org/protocol/amp';

// XEP-0080
export const GEOLOC = 'http://jabber.org/protocol/geoloc';

// XEP-0083
export const ROSTER_DELIMITER = 'roster:delimiter';

// XEP-0084
export const AVATAR_DATA = 'urn:xmpp:avatar:data';
export const AVATAR_METADATA = 'urn:xmpp:avatar:metadata';

// XEP-0085
export const CHAT_STATES = 'http://jabber.org/protocol/chatstates';

// XEP-0092
export const VERSION = 'jabber:iq:version';

// XEP-0107
export const MOOD = 'http://jabber.org/protocol/mood';

// XEP-0108
export const ACTIVITY = 'http://jabber.org/protocol/activity';

// XEP-0114
export const COMPONENT = 'jabber:component:accept';

// XEP-0115
export const CAPS = 'http://jabber.org/protocol/caps';

// XEP-0118
export const TUNE = 'http://jabber.org/protocol/tune';

// XEP-0122
export const DATAFORM_VALIDATION = 'http://jabber.org/protocol/xdata-validate';

// XEP-0124
export const BOSH = 'http://jabber.org/protocol/httpbind';

// XEP-0131
export const SHIM = 'http://jabber.org/protocol/shim';

// XEP-0138
export const COMPRESSION = 'http://jabber.org/features/compress';

// XEP-0141
export const DATAFORM_LAYOUT = 'http://jabber.org/protocol/xdata-layout';

// XEP-0144
export const ROSTER_EXCHANGE = 'http://jabber.org/protocol/rosterx';

// XEP-0145
export const ROSTER_NOTES = 'storage:rosternotes';

// XEP-0152
export const REACH_0 = 'urn:xmpp:reach:0';

// XEP-0153
export const VCARD_TEMP_UPDATE = 'vcard-temp:x:update';

// XEP-0156
export const ALT_CONNECTIONS_WEBSOCKET = 'urn:xmpp:alt-connections:websocket';
export const ALT_CONNECTIONS_XBOSH = 'urn:xmpp:alt-connections:xbosh';

// XEP-0158
export const CAPTCHA = 'urn:xmpp:captcha';

// XEP-0163
export const PEP_NOTIFY = (ns) => `${ns}+notify`; 

// XEP-0166
export const JINGLE_1 = 'urn:xmpp:jingle:1';
export const JINGLE_ERRORS_1 = 'urn:xmpp:jingle:errors:1';

// XEP-0167
export const JINGLE_RTP_1 = 'urn:xmpp:jingle:apps:rtp:1';
export const JINGLE_RTP_ERRORS_1 = 'urn:xmpp:jingle:apps:rtp:errors:1';
export const JINGLE_RTP_INFO_1 = 'urn:xmpp:jingle:apps:rtp:info:1';
export const JINGLE_RTP_AUDIO = 'urn:xmpp:jingle:apps:rtp:audio';
export const JINGLE_RTP_VIDEO = 'urn:xmpp:jingle:apps:rtp:video';

// XEP-0171
export const LANG_TRANS = 'urn:xmpp:langtrans';
export const LANG_TRANS_ITEMS = 'urn:xmpp:langtrans:items';

// XEP-0172
export const NICK = 'http://jabber.org/protocol/nick';

// XEP-0176
export const JINGLE_ICE_UDP_1 = 'urn:xmpp:jingle:transports:ice-udp:1';

// XEP-0177
export const JINGLE_RAW_UDP_1 = 'urn:xmpp:jingle:transports:raw-udp:1';

// XEP-0184
export const RECEIPTS = 'urn:xmpp:receipts';

// XEP-0186
export const INVISIBLE_0 = 'urn:xmpp:invisible:0';

// XEP-0191
export const BLOCKING = 'urn:xmpp:blocking';

// XEP-0198
export const SMACKS_3 = 'urn:xmpp:sm:3';

// XEP-0199
export const PING = 'urn:xmpp:ping';

// XEP-0202
export const TIME = 'urn:xmpp:time';

// XEP-0203
export const DELAY = 'urn:xmpp:delay';

// XEP-0206
export const BOSH_XMPP = 'urn:xmpp:xbosh';

// XEP-0215
export const DISCO_EXTERNAL_1 = 'urn:xmpp:extdisco:1';

// XEP-0221
export const DATAFORM_MEDIA = 'urn:xmpp:media-element';

// XEP-0224
export const ATTENTION_0 = 'urn:xmpp:attention:0';

// XEP-0231
export const BOB = 'urn:xmpp:bob';

// XEP-0234
export const FILE_TRANSFER_3 = 'urn:xmpp:jingle:apps:file-transfer:3';
export const FILE_TRANSFER_4 = 'urn:xmpp:jingle:apps:file-transfer:4';
export const FILE_TRANSFER_5 = 'urn:xmpp:jingle:apps:file-transfer:5';

// XEP-0249
export const MUC_DIRECT_INVITE = 'jabber:x:conference';

// XEP-0258
export const SEC_LABEL_0 = 'urn:xmpp:sec-label:0';
export const SEC_LABEL_CATALOG_2 = 'urn:xmpp:sec-label:catalog:2';
export const SEC_LABEL_ESS_0 = 'urn:xmpp:sec-label:ess:0';

// XEP-0260
export const JINGLE_SOCKS5_1 = 'urn:xmpp:jingle:transports:s5b:1';

// XEP-0261
export const JINGLE_IBB_1 = 'urn:xmpp:jingle:transports:ibb:1';

// XEP-0262
export const JINGLE_RTP_ZRTP_1 = 'urn:xmpp:jingle:apps:rtp:zrtp:1';

// XEP-0264
export const THUMBS_0 = 'urn:xmpp:thumbs:0';
export const THUMBS_1 = 'urn:xmpp:thumbs:1';

// XEP-0276
export const DECLOAKING_0 = 'urn:xmpp:decloaking:0';

// XEP-0280
export const CARBONS_2 = 'urn:xmpp:carbons:2';

// XEP-0293
export const JINGLE_RTP_RTCP_FB_0 = 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0';

// XEP-0294
export const JINGLE_RTP_HDREXT_0 = 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0';

// XEP-0297
export const FORWARD_0 = 'urn:xmpp:forward:0';

// XEP-0300
export const HASHES_1 = 'urn:xmpp:hashes:1';
export const HASH_NAME = (name) => `urn:xmpp:hash-function-text-names:${name}`;

// XEP-0301
export const RTT_0 = 'urn:xmpp:rtt:0';

// XEP-0307
export const MUC_UNIQUE = 'http://jabber.org/protocol/muc#unique';

// XEP-308
export const CORRECTION_0 = 'urn:xmpp:message-correct:0';

// XEP-0310
export const PSA = 'urn:xmpp:psa';

// XEP-0313
export const MAM_TMP = 'urn:xmpp:mam:tmp';
export const MAM_0 = 'urn:xmpp:mam:0';
export const MAM_1 = 'urn:xmpp:mam:1';
export const MAM_2 = 'urn:xmpp:mam:2';

// XEP-0317
export const HATS_0 = 'urn:xmpp:hats:0';

// XEP-0319
export const IDLE_1 = 'urn:xmpp:idle:1';

// XEP-0320
export const JINGLE_DTLS_0 = 'urn:xmpp:jingle:apps:dtls:0';

// XEP-0328
export const JID_PREP_0 = 'urn:xmpp:jidprep:0';

// XEP-0333
export const CHAT_MARKERS_0 = 'urn:xmpp:chat-markers:0';

// XEP-0334
export const HINTS = 'urn:xmpp:hints';

// XEP-0335
export const JSON_0 = 'urn:xmpp:json:0';

// XEP-0337
export const EVENTLOG = 'urn:xmpp:eventlog';

// XEP-0338
export const JINGLE_GROUPING_0 = 'urn:xmpp:jingle:apps:grouping:0';

// XEP-0339
export const JINGLE_RTP_SSMA_0 = 'urn:xmpp:jingle:apps:rtp:ssma:0';

// XEP-0340
export const COLIBRI = 'http://jitsi.org/protocol/colibri';

// XEP-0343
export const DTLS_SCTP_1 = 'urn:xmpp:jingle:transports:dtls-sctp:1';

// XEP-0352
export const CSI = 'urn:xmpp:csi:0';

// XEP-0353
export const JINGLE_MSG_INITIATE_0 = 'urn:xmpp:jingle:jingle-message:0';

// XEP-0357
export const PUSH_0 = 'urn:xmpp:push:0';

// XEP-0358
export const JINGLE_PUB_1 = 'urn:xmpp:jinglepub:1';

// XEP-0359
export const STANZA_ID_0 = 'urn:xmpp:sid:0';

// XEP-0363
export const HTTP_UPLOAD_0 = 'urn:xmpp:http:upload:0';

// XEP-0370
export const JINGLE_HTTP_0 = 'urn:xmpp:jingle:transports:http:0';
export const JINGLE_HTTP_UPLOAD_0 = 'urn:xmpp:jingle:transports:http:upload:0';

// XEP-0372
export const REFERENCE_0 = 'urn:xmpp:reference:0';

// XEP-0382
export const SPOILER_0 = 'urn:xmppp:spoiler:0';
