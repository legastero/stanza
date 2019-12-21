// ====================================================================
// draft-josefsson-idn-test-vectors: Nameprep and IDNA Test Vectors
// --------------------------------------------------------------------
// Source: https://tools.ietf.org/html/draft-josefsson-idn-test-vectors-00
// ====================================================================

import { nameprep, saslprep } from '../src/lib/stringprep';

test('Map to nothing', () => {
    expect(nameprep('foo\xad\u034f\u1806\u180bbar\u200b\u2060baz\ufe00\ufe08\ufe0f\ufeff')).toBe(
        'foobarbaz'
    );
});

test('Case folding ASCII U+0043 U+0041 U+0046 U+0045', () => {
    expect(nameprep('CAFE')).toBe('cafe');
});

test('Case folding 8bit U+00DF (german sharp s)', () => {
    expect(nameprep('\u00DF')).toBe('ss');
});

test('Case folding U+0130 (turkish capital I with dot)', () => {
    expect(nameprep('\u0130')).toBe('i\u0307');
});

test('Case folding multibyte U+0143 U+037A', () => {
    expect(nameprep('\u0143\u037A')).toBe('\u0144 \u03b9');
});

test('Case folding U+2121 U+33C6 U+1D7BB', () => {
    expect(nameprep('\u2121\u33C6\u{1d7bb}')).toBe('telc\u2215kg\u03c3');
});

test('Normalization of U+006a U+030c U+00A0 U+00AA', () => {
    expect(nameprep('\u006A\u030C\u00A0\u00AA')).toBe('\u01f0 a');
});

test('Case folding U+1FB7 and normalization', () => {
    expect(nameprep('\u1FB7')).toBe('\u1fb6\u03b9');
});

test('Self-reverting case folding U+01F0 and normalization', () => {
    expect(nameprep('\u01F0')).toBe('\u01F0');
});

test('Self-reverting case folding U+0390 and normalization', () => {
    expect(nameprep('\u0390')).toBe('\u0390');
});

test('Self-reverting case folding U+03B0 and normalization', () => {
    expect(nameprep('\u03B0')).toBe('\u03B0');
});

test('Self-reverting case folding U+1E96 and normalization', () => {
    expect(nameprep('\u1E96')).toBe('\u1E96');
});

test('Self-reverting case folding U+1F56 and normalization', () => {
    expect(nameprep('\u1F56')).toBe('\u1F56');
});

test('ASCII space character U+0020', () => {
    expect(nameprep('\x20')).toBe('\x20');
});

test('Non-ASCII 8bit space character U+00A0', () => {
    expect(nameprep('\u00A0')).toBe('\x20');
});

test('Non-ASCII multibyte space character U+1680', () => {
    expect(() => nameprep('\u1680')).toThrow('Prohibited code point');
});

test('Non-ASCII multibyte space character U+2000', () => {
    expect(nameprep('\u2000')).toBe('\x20');
});

test('Zero Width Space U+200b', () => {
    expect(nameprep('\u200b')).toBe('');
});

test('Non-ASCII multibyte space character U+3000', () => {
    expect(nameprep('\u3000')).toBe('\x20');
});

test('ASCII control characters U+0010 U+007F', () => {
    expect(nameprep('\x10\x7F')).toBe('\x10\x7F');
});

test('Non-ASCII 8bit control character U+0085', () => {
    expect(() => nameprep('\x85')).toThrow('Prohibited code point');
});

test('Non-ASCII multibyte control character U+180E', () => {
    expect(() => nameprep('\u180E')).toThrow('Prohibited code point');
});

test('Zero Width No-Break Space U+FEFF', () => {
    expect(nameprep('\uFEFF')).toBe('');
});

test('Non-ASCII control character U+1D175', () => {
    expect(() => nameprep('\u{1D175}')).toThrow('Prohibited code point');
});

test('Plane 0 private use character U+F123', () => {
    expect(() => nameprep('\uF123')).toThrow('Prohibited code point');
});

test('Plane 15 private use character U+F1234', () => {
    expect(() => nameprep('\u{F1234}')).toThrow('Prohibited code point');
});

test('Plane 16 private use character U+10F234', () => {
    expect(() => nameprep('\u{10F234}')).toThrow('Prohibited code point');
});

test('Non-character code point U+8FFFE', () => {
    expect(() => nameprep('\u{8FFFE}')).toThrow('Prohibited code point');
});

test('Non-character code point U+10FFFF', () => {
    expect(() => nameprep('\u{10FFFF}')).toThrow('Prohibited code point');
});

test('Surrogate code U+DF42', () => {
    expect(() => nameprep('\uDF42')).toThrow('Prohibited code point');
});

test('Non-plain text character U+FFFD', () => {
    expect(() => nameprep('\uFFFD')).toThrow('Prohibited code point');
});

test('Ideographic description character U+2FF5', () => {
    expect(() => nameprep('\u2FF5')).toThrow('Prohibited code point');
});

test('Display property character U+0341', () => {
    expect(nameprep('\u0341')).toBe('\u0301');
});

test('Left-to-right mark U+200E', () => {
    expect(() => nameprep('\u200E')).toThrow('Prohibited code point');
});

test('Deprecated U+202A', () => {
    expect(() => nameprep('\u202A')).toThrow('Prohibited code point');
});

test('Language tagging character U+E0001', () => {
    expect(() => nameprep('\u{E0001}')).toThrow('Prohibited code point');
});

test('Language tagging character U+E0042', () => {
    expect(() => nameprep('\u{E0042}')).toThrow('Prohibited code point');
});

test('Bidi: RandALCat character U+05BE and LCat characters', () => {
    expect(() => nameprep('foo\ufd50bar')).toThrow(
        'String contained both LCat and RandALCat code points'
    );
});

test('Bidi: RandALCat without trailing RandALCat U+0627 U+0031', () => {
    expect(() => nameprep('\u0627\u0031')).toThrow(
        'String containing RandALCat code points must start and end with RandALCat code points'
    );
});

test('Bidi: RandALCat character U+0627 U+0031 U+0628', () => {
    expect(nameprep('\u0627\u0031\u0628')).toBe('\u0627\u0031\u0628');
});

test('Unassigned code point U+E0002', () => {
    expect(() => nameprep('\u{E0002}', false)).toThrow('Unassigned code point');
});

test('Larger test (shrinking)', () => {
    expect(nameprep('\u0058\u00ad\u00df\u0130\u2121\u006a\u030c\u00a0\u00aa\u03b0\u2000')).toBe(
        '\u0078\u0073\u0073\u0069\u0307\u0074\u0065\u006c\u01f0\u0020\u0061\u03b0\u0020'
    );
});

test('Larger test (expanding)', () => {
    expect(nameprep('\u0058\u00df\u3316\u0130\u2121\u249f\u3300')).toBe(
        '\u0078\u0073\u0073\u30ad\u30ed\u30e1\u30fc\u30c8\u30eb\u0069\u0307\u0074\u0065\u006c\u0028\u0064\u0029\u30a2\u30d1\u30fc\u30c8'
    );
});

test('Use table C.1.2 for mapping', () => {
    expect(saslprep('\u2003')).toBe(' ');
});
