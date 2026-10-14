import { sum } from './sum.js';
if (sum(2,3) !== 5) { console.error('bad', sum(2,3)); process.exit(1); }
console.log('ok');
