# node-red-contrib-boolean-logic-plus

AND/OR/XOR boolean logic across a fixed number of distinct topics - the
same behaviour as the original `node-red-contrib-boolean-logic`, with a
second output added that reports the current true/false breakdown across
every configured topic.

This is an independent implementation matching the documented behaviour
of the original, not a fork of its source, released separately under
Apache-2.0.

## Install

```
npm install node-red-contrib-boolean-logic-plus
```

Or use `Manage Palette` in the Node-RED editor.

## Usage

Configure:
- **Operation** - And / Or / Exclusive Or
- **Number of topics** - how many distinct `msg.topic` values to expect
- **Topic** - the topic set on outgoing result messages
- **Invert** - flip the final result (AND->NAND, OR->NOR, XOR->XNOR)
- **Name** - optional

Feed it messages with different `msg.topic` values. It waits until it's
seen a value for every configured topic at least once, then re-evaluates
and outputs on every subsequent message. If a distinct topic beyond the
configured number ever arrives, it resets silently (no output) and waits
for a fresh full set.

### Output 1: result

```js
{ topic: "result", payload: true }
```

Reflects **Invert** if enabled - this is the final result.

### Output 2: true/false breakdown

An object listing which configured topics currently hold true and which
hold false - always the raw states, regardless of **Invert**:

```js
{ topic: "result", payload: { true: ["D", "E"], false: ["A", "B", "C"] } }
```

Only sent when the breakdown actually changes from the last time it was
sent - not on every evaluation, and not merely because the boolean result
on output 1 flipped while the underlying topics stayed the same.

### Node label

Shows the operation and topic count, e.g. `OR [2]` - with your **Name**
appended in brackets if you've set one, e.g. `OR [2] (garden lights)`.

### Status

Shows a dot colored green (true) or red (false), with the matching group
listed first: `true: D, E. false: A, B, C` when the result is true, or
`false: A, B, C. true: D, E` when it's false. Either group is omitted if
empty. While still priming: `1 of 3 topics received.`. After a reset:
`unknown`.

## Value conversion

Booleans are taken as-is. Numbers: `0` is false, anything else is true.
Strings that parse as a decimal number follow the same rule; the string
`"true"` (case-insensitive) is true; anything else is false.

## Exclusive Or with more than 2 topics

Matches the original: true only when **exactly one** topic is currently
true - not "an odd number are true". With 3+ topics all true, XOR is
false, same as the original.

## License

Apache-2.0
