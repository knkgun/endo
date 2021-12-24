/* Adapts a Node.js stream to an Writer<Uint8Array>, where a writer stream is
 * modeled as a hybrid async iterator + generator.
 */

// @ts-check
/// <reference types="ses"/>

import { makePipe } from '@endo/stream';

/**
 * Adapts a Node.js writable stream to a JavaScript
 * async iterator of Uint8Array data chunks.
 * Back pressure emerges from awaiting on the promise
 * returned by `next` before calling `next` again.
 *
 * @param {NodeJS.WritableStream} output the destination Node.js writer
 * @param {Object} [opts]
 * @param {string} [opts.name] a debug name for stream errors
 * @returns {import('@endo/stream').Writer<Uint8Array, void>}
 */
export const makeNodeWriter = (output, { name = '<unnamed stream>' } = {}) => {
  let onDrain = () => {};
  /** @param {Error} _error */
  let onError = _error => {};
  let drained = Promise.resolve();

  const didDrain = () => {
    drained = new Promise((resolve, reject) => {
      onDrain = resolve;
      onError = reject;
    });
  };

  didDrain();

  output.on('error', err => {
    onError(new Error(`Cannot write ${name}: ${err.message}`));
  });

  output.on('close', onDrain);
  output.on('drain', onDrain);

  const [target, source] = makePipe();

  const pump = async () => {
    try {
      const { value, done } = await source.next(undefined);
      if (done) {
        output.end();
      } else {
        if (!output.write(value)) {
          didDrain();
          await drained;
        }
        pump();
        return;
      }
    } catch (error) {
      output.end();
    }
  };

  pump();

  return target;
};
harden(makeNodeWriter);
