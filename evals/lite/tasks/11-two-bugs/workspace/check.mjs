import { add, clamp } from './math.js';
const fails = [];
if (add(2, 3) !== 5) fails.push('add');
if (clamp(-1, 0, 10) !== 0) fails.push('clamp-low');
if (clamp(99, 0, 10) !== 10) fails.push('clamp-high');
if (clamp(5, 0, 10) !== 5) fails.push('clamp-mid');
if (fails.length) { console.error(fails.join(',')); process.exit(1); }
console.log('ok');