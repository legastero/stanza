export async function timeoutPromise<T>(
    target: Promise<T>,
    delay: number,
    rejectValue: (() => any) = () => undefined
) {
    let timeoutRef: any;
    const result = await Promise.race([
        target,
        new Promise<T>((resolve, reject) => {
            timeoutRef = setTimeout(() => reject(rejectValue()), delay);
        })
    ]);
    if (timeoutRef) {
        clearTimeout(timeoutRef);
    }
    return result;
}

export async function sleep(time: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(() => resolve(), time);
    });
}

export function octetCompare(str1: string | Buffer, str2: string | Buffer): number {
    const b1 = typeof str1 === 'string' ? new Buffer(str1, 'utf8') : str1;
    const b2 = typeof str2 === 'string' ? new Buffer(str2, 'utf8') : str2;

    return b1.compare(b2);
}
