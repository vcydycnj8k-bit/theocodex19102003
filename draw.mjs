export function randomInt(max) {
  const limit = 4294967296 - (4294967296 % max);
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export function draw(names) {
  if (names.length < 2 || names.length > 30 || new Set(names.map(n => n.trim().toLocaleLowerCase('fr'))).size !== names.length || names.some(n => !n.trim())) throw new Error('Utilisez entre 2 et 30 prénoms distincts.');
  let result;
  do {
    result = names.map((_, i) => i);
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
  } while (result.some((recipient, giver) => recipient === giver));
  return result;
}
