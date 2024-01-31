/* eslint-disable @typescript-eslint/ban-types */
export function nextTick(callback: Function, ...args: any[]): void {
    queueMicrotask(() => callback(...args));
}
