export function isPalindrome(s) {
  // TODO
  return s === s.split('').reverse().join('');
}