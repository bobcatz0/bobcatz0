'use strict';

/**
 * Lightweight logging helpers for protocol debugging.
 * Reconstruction is iterative: when a packet is wrong, you want the opcode,
 * the length, and a hex preview right there in the console.
 */

const { C2S, S2C } = require('./opcodes');

function nameFor(table, op) {
  for (const k of Object.keys(table)) if (table[k] === op) return k;
  return 'UNKNOWN';
}

function hexPreview(buf, max = 48) {
  const slice = buf.subarray(0, max);
  let out = slice.toString('hex').replace(/(..)/g, '$1 ').trim();
  if (buf.length > max) out += ` … (+${buf.length - max}B)`;
  return out;
}

function ts() {
  return new Date().toISOString().substr(11, 12);
}

function inbound(clientId, opcode, buf) {
  console.log(
    `[${ts()}] C${clientId} <-- op ${opcode} (${nameFor(C2S, opcode)})  ${buf.length}B  ${hexPreview(buf)}`,
  );
}

function outbound(clientId, opcode, buf) {
  console.log(
    `[${ts()}] C${clientId} --> op ${opcode} (${nameFor(S2C, opcode)})  ${buf.length}B  ${hexPreview(buf)}`,
  );
}

function info(...args) {
  console.log(`[${ts()}]`, ...args);
}

module.exports = { inbound, outbound, info, hexPreview, nameFor };
