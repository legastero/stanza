import { AsyncPriorityQueue, priorityQueue } from 'async';
import Punycode from 'punycode';

import { RTT, RTTAction } from '../protocol';

export type UnicodeBuffer = number[];

export interface DisplayBufferState {
    text: string;
    cursorPosition: number;
    synced: boolean;
    drained?: boolean;
}

export interface InputBufferState {
    text: string;
}

/**
 * Calculate the erase and insert actions needed to describe the user's edit operation.
 *
 * Based on the code point buffers before and after the edit, we find the single erase
 * and insert actions needed to describe the full change. We are minimizing the number
 * of deltas, not minimizing the number of affected code points.
 *
 * @param oldText The original buffer of Unicode code points before the user's edit action.
 * @param newText The new buffer of Unicode code points after the user's edit action.
 */
export function diff(oldText: UnicodeBuffer, newText: UnicodeBuffer): RTTAction[] {
    const oldLen = oldText.length;
    const newLen = newText.length;

    const searchLen = Math.min(oldLen, newLen);

    let prefixSize = 0;
    for (prefixSize = 0; prefixSize < searchLen; prefixSize++) {
        if (oldText[prefixSize] !== newText[prefixSize]) {
            break;
        }
    }

    let suffixSize = 0;
    for (suffixSize = 0; suffixSize < searchLen - prefixSize; suffixSize++) {
        if (oldText[oldLen - suffixSize - 1] !== newText[newLen - suffixSize - 1]) {
            break;
        }
    }

    const matchedSize = prefixSize + suffixSize;
    const events: RTTAction[] = [];

    if (matchedSize < oldLen) {
        events.push({
            length: oldLen - matchedSize,
            position: oldLen - suffixSize,
            type: 'erase'
        });
    }

    if (matchedSize < newLen) {
        const insertedText = newText.slice(prefixSize, prefixSize + newLen - matchedSize);

        events.push({
            position: prefixSize,
            text: Punycode.ucs2.encode(insertedText),
            type: 'insert'
        });
    }

    return events;
}

/**
 * Class for processing RTT events and providing a renderable string of the resulting text.
 */
export class DisplayBuffer {
    public synced: boolean = false;
    public onStateChange: (state: DisplayBufferState) => void;
    public cursorPosition: number = 0;
    public ignoreWaits: boolean = false;

    private buffer: UnicodeBuffer;
    private timeDeficit: number = 0;
    private sequenceNumber: number = 0;
    private actionQueue!: AsyncPriorityQueue<RTTAction>;

    constructor(onStateChange?: (state: DisplayBufferState) => void, ignoreWaits: boolean = false) {
        this.onStateChange =
            onStateChange ||
            function noop() {
                return;
            };
        this.ignoreWaits = ignoreWaits;

        this.buffer = [];

        this.resetActionQueue();
    }

    /**
     * The encoded Unicode string to display.
     */
    public get text(): string {
        return Punycode.ucs2.encode(this.buffer.slice());
    }

    /**
     * Mark the RTT message as completed and reset state.
     */
    public commit(): void {
        this.resetActionQueue();
    }

    /**
     * Accept an RTT event for processing.
     *
     * A single event can contain multiple edit actions, including
     * wait pauses.
     *
     * Events must be processed in order of their `seq` value in order
     * to stay in sync.
     *
     * @param event {RTTEvent} The RTT event to process.
     */
    public process(event: RTT): void {
        if (event.event === 'cancel' || event.event === 'init') {
            this.resetActionQueue();
            return;
        } else if (event.event === 'reset' || event.event === 'new') {
            this.resetActionQueue();
            if (event.seq !== undefined) {
                this.sequenceNumber = event.seq;
            }
        } else if (event.seq !== this.sequenceNumber) {
            this.synced = false;
        }

        if (event.actions) {
            const baseTime = Date.now();
            let accumulatedWait = 0;
            for (const action of event.actions) {
                action.baseTime = baseTime + accumulatedWait;
                if (action.type === 'wait') {
                    accumulatedWait += action.duration;
                }
                this.actionQueue.push(action, 0);
            }
        }

        this.sequenceNumber = this.sequenceNumber + 1;
    }

    /**
     * Insert text into the Unicode code point buffer
     *
     * By default, the insertion position is the end of the buffer.
     *
     * @param text The raw text to insert
     * @param position The position to start the insertion
     */
    private insert(text: string = '', position: number = this.buffer.length): void {
        text = text.normalize('NFC');

        const insertedText = Punycode.ucs2.decode(text);

        this.buffer.splice(position, 0, ...insertedText);
        this.cursorPosition = position + insertedText.length;
        this.emitState();
    }

    /**
     * Erase text from the Unicode code point buffer
     *
     * By default, the erased text length is `1`, and the position is the end of the buffer.
     *
     * @param length The number of code points to erase from the buffer, starting at {position} and erasing to the left.
     * @param position The position to start erasing code points. Erasing continues to the left.
     */
    private erase(length: number = 1, position: number = this.buffer.length): void {
        position = Math.max(Math.min(position, this.buffer.length), 0);
        length = Math.max(Math.min(length, this.text.length), 0);

        this.buffer.splice(Math.max(position - length, 0), length);
        this.cursorPosition = Math.max(position - length, 0);
        this.emitState();
    }

    private emitState(additional: Partial<DisplayBufferState> = {}): void {
        this.onStateChange({
            cursorPosition: this.cursorPosition,
            synced: this.synced,
            text: this.text,
            ...additional
        });
    }

    /**
     * Reset the processing state and queue.
     *
     * Used when 'init', 'new', 'reset', and 'cancel' RTT events are processed.
     */
    private resetActionQueue(): void {
        if (this.actionQueue) {
            this.actionQueue.kill();
        }

        this.sequenceNumber = 0;
        this.synced = true;
        this.buffer = [];
        this.timeDeficit = 0;

        this.actionQueue = priorityQueue((action: RTTAction, done: () => void) => {
            const currentTime = Date.now();

            if (action.type === 'insert') {
                this.insert(action.text, action.position);
                return done();
            } else if (action.type === 'erase') {
                this.erase(action.length, action.position);
                return done();
            } else if (action.type === 'wait') {
                if (this.ignoreWaits) {
                    return done();
                }

                if (action.duration > 700) {
                    action.duration = 700;
                }

                const waitTime =
                    action.duration - (currentTime - action.baseTime!) + this.timeDeficit;
                if (waitTime <= 0) {
                    this.timeDeficit = waitTime;
                    return done();
                } else {
                    this.timeDeficit = 0;
                    setTimeout(() => done(), waitTime);
                }
            } else {
                return done();
            }
        }, 1);

        this.emitState();
    }
}

/**
 * Class for tracking changes in a source text, and generating RTT events based on those changes.
 */
export class InputBuffer {
    public onStateChange: (state: InputBufferState) => void;
    public resetInterval: number = 10000;
    public ignoreWaits: boolean = false;
    public sequenceNumber: number;

    private isStarting: boolean = false;
    private isReset: boolean = false;
    private buffer: UnicodeBuffer;
    private actionQueue: RTTAction[];
    private lastActionTime?: number;
    private lastResetTime?: number;
    private changedBetweenResets: boolean = false;

    constructor(onStateChange?: (state: InputBufferState) => void, ignoreWaits: boolean = false) {
        this.onStateChange =
            onStateChange ||
            function noop() {
                return;
            };
        this.ignoreWaits = ignoreWaits;

        this.buffer = [];
        this.actionQueue = [];
        this.sequenceNumber = 0;
    }

    public get text(): string {
        return Punycode.ucs2.encode(this.buffer.slice());
    }

    /**
     * Generate action deltas based on the new full state of the source text.
     *
     * The text provided here is the _entire_ source text, not a diff.
     *
     * @param text The new state of the user's text.
     */
    public update(text?: string): void {
        let actions: RTTAction[] = [];

        if (text !== undefined) {
            text = text.normalize('NFC');

            const newBuffer = Punycode.ucs2.decode(text);
            actions = diff(this.buffer, newBuffer.slice());

            this.buffer = newBuffer;
            this.emitState();
        }

        const now = Date.now();
        if (this.changedBetweenResets && now - this.lastResetTime! > this.resetInterval) {
            this.actionQueue = [];
            this.actionQueue.push({
                position: 0,
                text: this.text,
                type: 'insert'
            });
            this.isReset = true;
            this.lastActionTime = now;
            this.lastResetTime = now;
            this.changedBetweenResets = false;
        } else if (actions.length) {
            const wait = now - (this.lastActionTime || now);
            if (wait > 0 && !this.ignoreWaits) {
                this.actionQueue.push({
                    duration: wait,
                    type: 'wait'
                });
            }
            for (const action of actions) {
                this.actionQueue.push(action);
            }
            this.lastActionTime = now;
            this.changedBetweenResets = true;
        } else {
            this.lastActionTime = now;
        }
    }

    /**
     * Formally start an RTT session.
     *
     * Generates a random starting event sequence number.
     *
     * @param resetInterval {Milliseconds} Time to wait between using RTT reset events during editing.
     */
    public start(resetInterval: number = this.resetInterval): RTT {
        this.commit();
        this.isStarting = true;
        this.resetInterval = resetInterval;
        this.sequenceNumber = Math.floor(Math.random() * 10000 + 1);
        return {
            event: 'init'
        };
    }

    /**
     * Formally stops the RTT session.
     */
    public stop(): RTT {
        this.commit();
        return {
            event: 'cancel'
        };
    }

    /**
     * Generate an RTT event based on queued edit actions.
     *
     * The edit actions included in the event are all those made since the last
     * time a diff was requested.
     */
    public diff(): RTT | null {
        this.update();

        if (!this.actionQueue.length) {
            return null;
        }

        const event: RTT = {
            actions: this.actionQueue,
            seq: this.sequenceNumber++
        };

        if (this.isStarting) {
            event.event = 'new';
            this.isStarting = false;
            this.lastResetTime = Date.now();
        } else if (this.isReset) {
            event.event = 'reset';
            this.isReset = false;
        }

        this.actionQueue = [];

        return event;
    }

    /**
     * Reset the RTT session state to prepare for a new message text.
     */
    public commit(): void {
        this.sequenceNumber = 0;
        this.lastActionTime = 0;
        this.actionQueue = [];
        this.buffer = [];
    }

    private emitState(): void {
        this.onStateChange({
            text: this.text
        });
    }
}
