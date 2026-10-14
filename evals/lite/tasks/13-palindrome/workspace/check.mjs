import { isPalindrome } from './palindrome.js';
const cases = [
  ['', true],
  ['a', true],
  ['ab', false],
  ['aba', true],
  ['A man, a plan, a canal: Panama', true],
  ['race a car', false],
  ['0P', false],
];
for (const [input, expect] of cases) {
  const got = isPalindrome(input);
  if (got !== expect) {
    console.error(JSON.stringify({input, expect, got}));
    process.exit(1);
  }
}
console.log('ok');