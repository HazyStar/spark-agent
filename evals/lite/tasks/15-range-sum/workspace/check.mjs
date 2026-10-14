import { rangeSum } from './rangeSum.js';
if (rangeSum(0) !== 0) { console.error('n0', rangeSum(0)); process.exit(1); }
if (rangeSum(1) !== 1) { console.error('n1', rangeSum(1)); process.exit(1); }
if (rangeSum(5) !== 15) { console.error('n5', rangeSum(5)); process.exit(1); }
let threw = false;
try { rangeSum(-1); } catch { threw = true; }
if (!threw) { console.error('neg'); process.exit(1); }
console.log('ok');