export function add(a, b) {
  return a - b;
}

export function clamp(n, min, max) {
  if (n < min) return max; // bug: should return min
  if (n > max) return min; // bug: should return max
  return n;
}