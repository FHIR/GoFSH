// Adds expected backslash-escapes to a string to make it a FSH string
export function fshifyString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Removes the underscore on paths of children of primitive elements
export function removeUnderscoreForPrimitiveChildPath(input: string): string {
  return input
    .split('.')
    .map(p => p.replace(/^_/, ''))
    .join('.');
}
