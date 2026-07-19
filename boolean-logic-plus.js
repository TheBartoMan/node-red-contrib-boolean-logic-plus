module.exports = function (RED) {
    "use strict";

    // Boolean values are taken as-is. Numbers: 0 -> false, anything else -> true.
    // Strings that parse as a decimal number follow the number rule; the string
    // "true" (case-insensitive) is true; anything else is false.
    function toBool(payload) {
        if (typeof payload === "boolean") return payload;
        if (typeof payload === "number") return payload !== 0;
        if (typeof payload === "string") {
            const trimmed = payload.trim();
            if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
                return Number(trimmed) !== 0;
            }
            return trimmed.toLowerCase() === "true";
        }
        return false;
    }

    function evaluate(operation, values) {
        const bools = Object.values(values);
        if (operation === "and") return bools.every(Boolean);
        if (operation === "or") return bools.some(Boolean);
        // xor: exactly one topic true - not the odd-parity generalisation
        if (operation === "xor") return bools.filter(Boolean).length === 1;
        return false;
    }

    function BooleanLogicPlusNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.operation = config.operation || "and";
        node.numTopics = Math.max(1, parseInt(config.numTopics, 10) || 1);
        node.outTopic = config.topic || "result";
        node.invert = !!config.invert;

        let values = {};          // topic -> boolean
        let topicsSeen = new Set();
        let lastTrueKey = null;   // signature of the true-topics set last sent on output 2

        function showUnknown() {
            node.status({ fill: "grey", shape: "ring", text: "unknown" });
        }

        function showWaiting(count) {
            node.status({ fill: "yellow", shape: "dot", text: count + " of " + node.numTopics + " topics received." });
        }

        function showResult(result, trueTopics, falseTopics) {
            const parts = [];
            if (falseTopics.length) parts.push("false: " + falseTopics.join(", "));
            if (trueTopics.length) parts.push("true: " + trueTopics.join(", "));
            node.status({
                fill: result ? "green" : "red",
                shape: result ? "dot" : "ring",
                text: parts.join(". ")
            });
        }

        showUnknown();

        node.on("input", function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (err) { if (err) node.error(err, msg); };

            if (msg.topic === undefined || msg.payload === undefined) {
                return done();
            }

            // Always store first, then check the resulting distinct-topic count -
            // matches the original: an (N+1)th topic still gets written before
            // the overflow is detected and everything is cleared.
            values[msg.topic] = toBool(msg.payload);
            topicsSeen.add(msg.topic);
            const keyCount = topicsSeen.size;

            if (keyCount === node.numTopics) {
                const rawResult = evaluate(node.operation, values);
                const result = node.invert ? !rawResult : rawResult;
                const trueTopics = Object.keys(values).filter((t) => values[t]).sort();
                const falseTopics = Object.keys(values).filter((t) => !values[t]).sort();

                showResult(result, trueTopics, falseTopics);

                const trueKey = trueTopics.join(",");
                let out2 = null;
                if (trueKey !== lastTrueKey) {
                    out2 = { topic: node.outTopic, payload: { true: trueTopics, false: falseTopics } };
                    lastTrueKey = trueKey;
                }

                send([
                    { topic: node.outTopic, payload: result },
                    out2
                ]);
            } else if (keyCount > node.numTopics) {
                node.warn(
                    (config.name && config.name.length > 0 ? config.name : "boolean-logic-plus") +
                    " [" + node.operation.toUpperCase() + "]: received more than the configured " +
                    node.numTopics + " topics; resetting and waiting for " + node.numTopics + " new topics."
                );
                values = {};
                topicsSeen = new Set();
                lastTrueKey = null;
                showUnknown();
            } else {
                showWaiting(keyCount);
            }

            done();
        });
    }

    RED.nodes.registerType("boolean-logic-plus", BooleanLogicPlusNode);
};
