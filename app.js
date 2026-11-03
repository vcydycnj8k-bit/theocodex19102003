import { draw } from './draw.mjs';
let names = ['Eva', 'Théo', 'Lea', 'Elio', 'Lucas', 'Ella'];
let budget = 50;
let wishes = Object.create(null), personalBudgets = Object.create(null);
let storageWarning = '';
const storageKey = 'family-secret-santa-settings-v1';
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Array.isArray(saved.names) && saved.names.length <= 30 && saved.names.every(n => typeof n === 'string' && n.trim() && n.length <= 30) && new Set(saved.names.map(n => n.toLocaleLowerCase('fr'))).size === saved.names.length) {
    names = saved.names;
    if (Number.isFinite(saved.budget) && saved.budget >= 0 && saved.budget <= 100000) budget = saved.budget;
    for (const name of names) {
      if (typeof saved.wishes?.[name] === 'string') wishes[name] = saved.wishes[name].slice(0, 1000);
      const amount = saved.personalBudgets?.[name];
      if (Number.isFinite(amount) && amount >= 0 && amount <= 100000) personalBudgets[name] = amount;
    }
  }
} catch { storageWarning = 'Sauvegarde locale indisponible : gardez cet onglet ouvert.'; }
const euros = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ names, budget, wishes, personalBudgets }));
    $('save-status').textContent = 'Enregistré sur cet appareil uniquement. Les souhaits sont visibles par tous ici.';
  } catch { $('save-status').textContent = 'Sauvegarde locale indisponible : vos modifications restent dans cet onglet uniquement.'; }
}
function renderGiftSettings() {
  $('budget').value = budget;
  $('gift-fields').disabled = !!assignments;
  $('wishlists').replaceChildren();
  names.forEach((name, i) => {
    const card = document.createElement('div'); card.className = 'wish-card';
    const heading = document.createElement('h3'); heading.textContent = name;
    const label = document.createElement('label'); label.htmlFor = `wishes-${i}`; label.textContent = 'Ma liste de souhaits';
    const textarea = document.createElement('textarea'); textarea.id = label.htmlFor; textarea.maxLength = 1000; textarea.rows = 4; textarea.placeholder = 'Un livre, un jeu, une sortie…\nUne idée par ligne'; textarea.value = wishes[name] || '';
    textarea.oninput = () => { wishes[name] = textarea.value; saveSettings(); };
    const amountLabel = document.createElement('label'); amountLabel.htmlFor = `amount-${i}`; amountLabel.textContent = 'Mon maximum pour le cadeau que j’offre (€)';
    const amount = document.createElement('input'); amount.id = amountLabel.htmlFor; amount.type = 'number'; amount.min = '0'; amount.max = '100000'; amount.step = '0.01'; amount.inputMode = 'decimal'; amount.placeholder = `Budget commun : ${euros(budget)}`; amount.value = personalBudgets[name] ?? '';
    amount.oninput = () => {
      amount.setCustomValidity('');
      if (!amount.validity.valid) { amount.setCustomValidity('Choisissez un montant entre 0 et 100 000 €, avec au maximum deux décimales.'); return; }
      if (amount.value === '') delete personalBudgets[name]; else personalBudgets[name] = amount.valueAsNumber;
      saveSettings();
    };
    card.append(heading, label, textarea, amountLabel, amount); $('wishlists').append(card);
  });
}
let assignments = null, current = 0, rotation = 0, spinning = false;
const $ = id => document.getElementById(id);
const colors = ['#355646', '#b55b47', '#c2aa70', '#7c8e73', '#d2967c', '#8c9c89'];
function render() {
  renderGiftSettings();
  $('participants').replaceChildren();
  names.forEach((name, i) => {
    const li = document.createElement('li');
    const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.textContent = name[0].toUpperCase();
    const label = document.createElement('span'); label.textContent = name;
    const remove = document.createElement('button'); remove.className = 'remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Retirer ${name}`); remove.disabled = !!assignments;
    remove.onclick = () => { names.splice(i, 1); delete wishes[name]; delete personalBudgets[name]; saveSettings(); render(); };
    li.append(avatar, label, remove); $('participants').append(li);
  });
  $('wheel').replaceChildren();
  $('wheel').style.background = names.length ? `conic-gradient(${names.map((_, i) => `${colors[i % colors.length]} ${i * 360 / names.length}deg ${(i + 1) * 360 / names.length}deg`).join(',')})` : '#dce1d4';
  names.forEach((name, i) => {
    const label = document.createElement('span'); label.className = 'wheel-label'; label.textContent = name;
    label.style.transform = `rotate(${(i + .5) * 360 / names.length - 90}deg) translateY(-50%)`;
    label.style.fontSize = names.length > 12 ? '10px' : '15px'; $('wheel').append(label);
  });
  $('name').disabled = !!assignments; document.querySelector('.add').disabled = !!assignments;
  $('spin').disabled = names.length < 2 || current >= names.length || spinning;
  $('reset').hidden = !assignments;
  $('turn').textContent = assignments ? current < names.length ? `À vous, ${names[current]} !` : 'Tous les secrets sont distribués !' : 'On lance la magie ?';
  $('progress').textContent = assignments ? `${Math.min(current + 1, names.length)} / ${names.length} · LE TIRAGE EN FAMILLE` : 'LE HASARD FAIT BIEN LES CHOSES';
  $('spin').textContent = assignments ? 'Faire tourner la roulette ↗' : 'Lancer le tirage ↗';
  $('hint').textContent = current >= names.length && assignments ? 'Rendez-vous à Noël pour découvrir les cadeaux.' : 'Passez l’écran à la personne indiquée avant chaque tour.';
}
$('add-form').onsubmit = e => {
  e.preventDefault(); if (assignments) return;
  const name = $('name').value.trim().normalize('NFC');
  if (!name) { $('error').textContent = 'Saisissez un prénom.'; return; }
  if (names.some(n => n.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) { $('error').textContent = 'Ce prénom est déjà dans la famille. Ajoutez une initiale si besoin.'; return; }
  if (names.length >= 30) { $('error').textContent = 'La roulette accepte au maximum 30 personnes.'; return; }
  names.push(name); saveSettings(); $('name').value = ''; $('error').textContent = ''; render(); $('name').focus();
};
$('spin').onclick = () => {
  if (spinning || current >= names.length || names.length < 2) return;
  if (!assignments) { if (![...$('gift-fields').querySelectorAll('input')].every(input => input.reportValidity())) return; assignments = draw(names); render(); return; }
  spinning = true; render();
  const target = assignments[current];
  const destination = (360 - (target + .5) * 360 / names.length) % 360;
  rotation += 5 * 360 + ((destination - rotation % 360 + 360) % 360);
  $('wheel').style.transform = `rotate(${rotation}deg)`;
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 4100;
  setTimeout(() => {
    spinning = false; $('giver').textContent = `LE PETIT SECRET DE ${names[current].toLocaleUpperCase('fr')}`;
    $('recipient').textContent = names[target];
    $('reveal-budget').textContent = `Votre budget maximum : ${euros(personalBudgets[names[current]] ?? budget)}`;
    $('reveal-wishes').replaceChildren();
    const ideas = (wishes[names[target]] || '').split('\n').map(s => s.trim()).filter(Boolean);
    for (const idea of ideas.length ? ideas : ['Pas encore de souhait : une jolie surprise sera la bienvenue !']) {
      const li = document.createElement('li'); li.textContent = idea; $('reveal-wishes').append(li);
    }
    $('reveal').showModal(); $('next').focus();
  }, duration);
};
function next() { $('reveal').close(); $('recipient').textContent = ''; $('reveal-budget').textContent = ''; $('reveal-wishes').replaceChildren(); current++; render(); $('spin').focus(); }
$('next').onclick = next;
$('reveal').addEventListener('cancel', e => { e.preventDefault(); next(); });
$('reset').onclick = () => {
  if (spinning || !confirm('Effacer ce tirage et recommencer pour toute la famille ?')) return;
  assignments = null; current = 0; $('error').textContent = ''; render();
};
$('budget').oninput = () => {
  const input = $('budget');
  if (!input.validity.valid) { $('budget-error').textContent = 'Indiquez un budget entre 0 et 100 000 €, avec au maximum deux décimales.'; return; }
  budget = input.valueAsNumber; $('budget-error').textContent = ''; saveSettings();
  names.forEach((_, i) => { $(`amount-${i}`).placeholder = `Budget commun : ${euros(budget)}`; });
};
render();
if (storageWarning) $('save-status').textContent = storageWarning;
