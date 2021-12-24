// @ts-check
/// <reference types="ses"/>

// This module provided for sake of fewer head scratches.
// Node.js readable streams satisfy the signature of an async iterable iterator.
// They however iterate Node.js Buffer values and are not hardened, so this
// implementation compensates for both.

/**
 * @param {NodeJS.ReadableStream} input the source Node.js reader
 * @returns {import('@endo/stream').Reader<Uint8Array, void>}
 */
export const makeNodeReader = input => {
  const iterator = input[Symbol.asyncIterator]();
  const reader = harden({
    async next() {
      const result = await iterator.next();
      if (result.done) {
        return result;
      }
      return {
        done: false,
        value: new Uint8Array(result.value.buffer),
      };
    },
    async return() {
      return iterator.return();
    },
    /** @param {Error} error */
    async throw(error) {
      return iterator.throw(error);
    },
    [Symbol.asyncIterator]() {
      return reader;
    },
  });
  return reader;
};
harden(makeNodeReader);
