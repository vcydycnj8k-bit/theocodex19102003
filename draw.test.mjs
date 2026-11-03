import test from 'node:test';
import assert from 'node:assert/strict';
import { draw } from './draw.mjs';
test('10 000 tirages sans doublon ni auto-attribution', () => {
 for (let i = 0; i < 10000; i++) {
  const names = ['Eva', 'Théo', 'Lea', 'Elio', 'Lucas', 'Ella'];
  const result = draw(names);
  assert.equal(new Set(result).size, names.length);
  result.forEach((recipient, giver) => { assert.notEqual(recipient, giver); assert.ok(recipient >= 0 && recipient < names.length); });
 }
});
test('tailles de famille de 2 à 30', () => {
 for(let n = 2; n <= 30; n++) {
  const result = draw(Array.from({length:n}, (_, i) => String(i)));
  assert.equal(new Set(result).size, n);
  assert.ok(result.every((value, i) => value !== i));
 }
});
test('refuse les listes invalides', () => {
 for(const names of [[], ['Eva'], ['Eva','eva'], ['','Théo']]) assert.throws(() => draw(names));
});
