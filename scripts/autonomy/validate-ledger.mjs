#!/usr/bin/env node
import { readLedger, validateLedger } from './lib.mjs';

const errors = validateLedger(readLedger());
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log('Autonomous task ledger is valid.');
