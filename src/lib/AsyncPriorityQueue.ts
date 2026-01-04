export type Worker<T> = (task: T, done: () => void) => Promise<void> | void;

export interface AsyncPriorityQueue<T> {
    push(task: T, priority: number, callback?: (err?: Error) => void): void;
    pause(): void;
    resume(): void;
    kill(): void;
    idle(): boolean;
    drain(): Promise<void>;
}

interface HeapEntry<T> {
    task: T;
    priority: number;
    insertionOrder: number;
    callback?: (err?: Error) => void;
}

class MinHeap<T> {
    private heap: Array<HeapEntry<T>> = [];
    private insertionCounter = 0;

    get length(): number {
        return this.heap.length;
    }

    push(task: T, priority: number, callback?: (err?: Error) => void): void {
        // Reset counter when heap is empty to prevent overflow in long-lived queues
        if (this.heap.length === 0) {
            this.insertionCounter = 0;
        }
        const entry: HeapEntry<T> = {
            task,
            priority,
            insertionOrder: this.insertionCounter++,
            callback
        };
        this.heap.push(entry);
        this.bubbleUp(this.heap.length - 1);
    }

    private isHigherPriority(a: HeapEntry<T>, b: HeapEntry<T>): boolean {
        if (a.priority !== b.priority) {
            return a.priority < b.priority;
        }
        return a.insertionOrder < b.insertionOrder;
    }

    pop(): HeapEntry<T> | undefined {
        if (this.heap.length === 0) {
            return undefined;
        }
        const result = this.heap[0];
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return result;
    }

    clear(): void {
        this.heap = [];
        this.insertionCounter = 0;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            if (!this.isHigherPriority(this.heap[index], this.heap[parentIndex])) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
        const length = this.heap.length;
        while (true) {
            const left = (index << 1) + 1;
            const right = left + 1;
            let smallest = index;

            if (left < length && this.isHigherPriority(this.heap[left], this.heap[smallest])) {
                smallest = left;
            }
            if (right < length && this.isHigherPriority(this.heap[right], this.heap[smallest])) {
                smallest = right;
            }
            if (smallest === index) {
                break;
            }
            this.swap(index, smallest);
            index = smallest;
        }
    }

    private swap(i: number, j: number): void {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}

export function priorityQueue<T>(worker: Worker<T>, concurrency = 1): AsyncPriorityQueue<T> {
    const heap = new MinHeap<T>();
    let paused = false;
    let killed = false;
    let running = 0;
    let drainResolvers: Array<() => void> = [];

    const checkDrain = (): void => {
        if (heap.length === 0 && running === 0) {
            for (const resolve of drainResolvers) {
                resolve();
            }
            drainResolvers = [];
        }
    };

    const process = async (): Promise<void> => {
        if (paused || killed || running >= concurrency || heap.length === 0) {
            return;
        }

        const entry = heap.pop();
        if (!entry) {
            return;
        }

        running++;

        try {
            await new Promise<void>(resolve => {
                const done = () => resolve();
                const result = worker(entry.task, done);
                if (result instanceof Promise) {
                    result.then(done).catch(done);
                }
            });
            entry.callback?.();
        } catch (err) {
            entry.callback?.(err instanceof Error ? err : new Error(String(err)));
        } finally {
            running--;
            if (!killed) {
                checkDrain();
                process();
            }
        }
    };

    return {
        push(task: T, priority: number, callback?: (err?: Error) => void): void {
            if (killed) {
                return;
            }
            heap.push(task, priority, callback);
            queueMicrotask(() => process());
        },

        pause(): void {
            paused = true;
        },

        resume(): void {
            paused = false;
            process();
        },

        kill(): void {
            killed = true;
            heap.clear();
            drainResolvers = [];
        },

        idle(): boolean {
            return heap.length === 0 && running === 0;
        },

        drain(): Promise<void> {
            if (heap.length === 0 && running === 0) {
                return Promise.resolve();
            }
            return new Promise(resolve => {
                drainResolvers.push(resolve);
            });
        }
    };
}
