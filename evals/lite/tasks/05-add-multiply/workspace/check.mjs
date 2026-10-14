import { add, multiply } from './math.js';
if (add(1,2) !== 3) process.exit(1);
if (multiply(3,4) !== 12) { console.error('multiply', multiply(3,4)); process.exit(1); }
console.log('ok');
