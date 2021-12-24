// @ts-check

import 'ses';
import './lockdown.js';
import { spawn } from 'child_process';
import test from 'ava';
import { makeNodeReader, makeNodeWriter } from '../index.js';

test('stream to and from Node.js reader/writer', async t => {
  const scratch = new Uint8Array(1024 * 16);
  for (let i = 0; i < scratch.byteLength; i += 1) {
    scratch[i] = i % 256;
  }

  const child = spawn('cat', { stdio: ['pipe', 'pipe', 'inherit'] });
  const writer = makeNodeWriter(child.stdin);
  const reader = makeNodeReader(child.stdout);

  const makeProducer = async () => {
    let chunkLength = 1;
    for (let i = 0; i < scratch.byteLength; ) {
      const j = i + chunkLength;

      // eslint-disable-next-line no-await-in-loop
      await writer.next(scratch.subarray(i, j));

      i = j;
      chunkLength *= 2;
    }
    await writer.return();
  };

  const makeConsumer = async () => {
    let i = 0;
    for await (const chunk of reader) {
      const j = i + chunk.byteLength;
      t.deepEqual(chunk, scratch.subarray(i, j));
      i = j;
    }
    t.is(i, scratch.byteLength);
  };

  await Promise.all([makeProducer(), makeConsumer()]);
});
