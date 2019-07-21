# HookEmitter

## What is this?

An event emitter where the event handlers are async, chained, and can return data to the caller.

## Usage

```javascript
const events = new HookEmitter();

events.on('test', event => {
    console.log(event.name);
    console.log(event.data);
});

events.emit('test', {
    foo: 'bar'
});
```

Event handlers can be assigned a priority, where the highest priority value is ran first:

```javascript
events.on(
    'chained',
    event => {
        console.log('Will run first');
    },
    100
);

events.on(
    'chained',
    event => {
        console.log('Will run last');
    },
    -100
);

events.on('chained', event => {
    console.log('In the middle, with default priority of 0');
});
```

The data passed in the initial `emit()` call will be passed to each handler, but each handler MAY alter the data. At the end, the data object is returnd to the `emit()` caller.

```javascript
events.on(
    'alter',
    event => {
        event.data.list.push('Bar');
    },
    5
);

events.on(
    'alter',
    event => {
        event.data.list.push('Foo');
    },
    10
);

const result = await events.emit('alter', { list: [] });
console.log(result);
// { list: [ 'Foo', 'Bar' ] }
```
