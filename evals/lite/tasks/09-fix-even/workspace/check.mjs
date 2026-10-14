import { isEven } from './isEven.js';
if (isEven(2) !== true || isEven(3) !== false) { console.error('fail'); process.exit(1); }
console.log('ok');
