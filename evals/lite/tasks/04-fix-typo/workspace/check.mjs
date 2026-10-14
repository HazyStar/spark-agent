import { greet } from './greet.js';
const s = greet('Spark');
if (s !== 'Hello, Spark!') { console.error(s); process.exit(1); }
console.log('ok');
