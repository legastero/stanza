import * as fs from 'fs';

import { IntermediateSessionDescription, exportToSDP } from '../../../src/jingle/sdp/Intermediate';
import {
    convertIntermediateToRequest,
    convertRequestToIntermediate
} from '../../../src/jingle/sdp/Protocol';
import { NS_JINGLE_ICE_UDP_1 } from '../../../src/Namespaces';
import { Jingle } from '../../../src/protocol';

const rawSDP =
    fs
        .readFileSync(__dirname + '/audio-video.sdp')
        .toString()
        .trim()
        .split('\n')
        .join('\r\n') + '\r\n';
const parsedSDP: IntermediateSessionDescription = JSON.parse(
    fs.readFileSync(__dirname + '/audio-video.json').toString()
);
const jingleRequest: Jingle = JSON.parse(
    fs.readFileSync(__dirname + '/audio-video-jingle.json').toString()
);

const parsedDatachannel: IntermediateSessionDescription = JSON.parse(
    fs.readFileSync(__dirname + '/datachannel.json').toString()
);
const jingleDatachannel: Jingle = JSON.parse(
    fs.readFileSync(__dirname + '/datachannel-jingle.json').toString()
);

test('Convert intermediate to request', () => {
    expect(convertIntermediateToRequest(parsedSDP, 'initiator', NS_JINGLE_ICE_UDP_1)).toStrictEqual(
        jingleRequest
    );
});

test('Convert request to sdp', () => {
    const intermediate = convertRequestToIntermediate(jingleRequest, 'initiator');
    const lines = exportToSDP(intermediate).split('\r\n');
    lines.shift();
    lines.shift();

    expect(
        `v=0\r\n` +
            `o=thisisadapterortc 4613970882711076 2 IN IP4 127.0.0.1\r\n` +
            lines.join('\r\n')
    ).toBe(rawSDP.trim() + '\r\n');
});

test('Convert intermediate to request', () => {
    expect(
        convertIntermediateToRequest(parsedDatachannel, 'initiator', NS_JINGLE_ICE_UDP_1)
    ).toStrictEqual(jingleDatachannel);
});

test('Convert request to intermediate', () => {
    expect(convertRequestToIntermediate(jingleDatachannel, 'initiator')).toStrictEqual(
        parsedDatachannel
    );
});
