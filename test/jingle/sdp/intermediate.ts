import * as fs from 'fs';

import {
    importFromSDP,
    exportToSDP,
    IntermediateSessionDescription
} from '../../../src/jingle/sdp/Intermediate';

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

const datachannel =
    fs
        .readFileSync(__dirname + '/datachannel.sdp')
        .toString()
        .trim()
        .split('\n')
        .join('\r\n') + '\r\n';
const parsedDatachannel: IntermediateSessionDescription = JSON.parse(
    fs.readFileSync(__dirname + '/datachannel.json').toString()
);

test('Import from SDP', () => {
    expect(importFromSDP(rawSDP)).toStrictEqual(parsedSDP);
});

test('Import from Datachannel SDP', () => {
    expect(importFromSDP(datachannel)).toStrictEqual(parsedDatachannel);
});

test('Export to SDP', () => {
    const lines = exportToSDP(parsedSDP).split('\r\n');
    lines.shift();
    lines.shift();

    expect(
        `v=0\r\n` +
            `o=thisisadapterortc 4613970882711076 2 IN IP4 127.0.0.1\r\n` +
            lines.join('\r\n')
    ).toBe(rawSDP.trim() + '\r\n');
});

test('Export to Datachannel SDP', () => {
    const lines = exportToSDP(parsedDatachannel).split('\r\n');
    lines.shift();
    lines.shift();

    expect(
        `v=0\r\n` +
            `o=thisisadapterortc 4613970882711076 2 IN IP4 127.0.0.1\r\n` +
            lines.join('\r\n')
    ).toBe(datachannel.trim() + '\r\n');
});
