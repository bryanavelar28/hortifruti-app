const products = [
  { id: 'banana', name: 'Banana-prata', category: 'Frutas', price: 699, unit: 'kg', art: '🍌', tint: '#fff0c9' },
  { id: 'maca', name: 'Maçã Fuji', category: 'Frutas', price: 1199, unit: 'kg', art: '🍎', tint: '#f9e1dc' },
  { id: 'tomate', name: 'Tomate italiano', category: 'Legumes', price: 899, unit: 'kg', art: '🍅', tint: '#fce5da' },
  { id: 'alface', name: 'Alface crespa', category: 'Verduras', price: 399, unit: 'pé', art: '🥬', tint: '#e8efd8' },
  { id: 'cenoura', name: 'Cenoura', category: 'Legumes', price: 649, unit: 'kg', art: '🥕', tint: '#ffe9cf' },
  { id: 'brocolis', name: 'Brócolis', category: 'Verduras', price: 799, unit: 'maço', art: '🥦', tint: '#e1eedc' },
  { id: 'manga', name: 'Manga Palmer', category: 'Frutas', price: 749, unit: 'un.', art: '🥭', tint: '#fff0d7' },
  { id: 'pepino', name: 'Pepino japonês', category: 'Legumes', price: 599, unit: 'kg', art: '🥒', tint: '#ebf1d7' },
];

const byId = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPrice = (cents) => money.format(cents / 100);
const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const storageKey = 'feira-verde-cesta';
const cart = byId('cart');
const basket = new Map();
const categories = ['Todos', 'Frutas', 'Verduras', 'Legumes'];
let category = 'Todos';

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const { id } of products) {
    const quantity = saved?.[id];
    if (Number.isInteger(quantity) && quantity > 0 && quantity <= 99) basket.set(id, quantity);
  }
} catch {
  // The basket remains usable when browser storage is unavailable.
}

function renderProducts() {
  const query = normalize(byId('search').value.trim());
  const visible = products.filter((product) =>
    (category === 'Todos' || product.category === category) &&
    normalize(product.name).includes(query)
  );

  byId('empty').hidden = visible.length > 0;
  byId('products').innerHTML = visible.map((product) => `
    <article class="product">
      <div class="product-art" style="--tint: ${product.tint}" aria-hidden="true">${product.art}</div>
      <div class="product-body">
        <h3>${product.name}</h3>
        <p><strong>${formatPrice(product.price)}</strong> <small>/ ${product.unit}</small></p>
        <button data-add="${product.id}" aria-label="Adicionar ${product.name} à cesta">Adicionar</button>
      </div>
    </article>
  `).join('');
}

function cartLines() {
  return products.filter(({ id }) => basket.has(id)).map((product) => {
    const quantity = basket.get(product.id);
    return { ...product, quantity, total: product.price * quantity };
  });
}

function renderCart() {
  const lines = cartLines();
  byId('count').textContent = lines.reduce((count, line) => count + line.quantity, 0);
  byId('cart-empty').hidden = lines.length > 0;
  byId('cart-summary').hidden = lines.length === 0;
  byId('subtotal').textContent = formatPrice(lines.reduce((sum, line) => sum + line.total, 0));
  byId('cart-items').innerHTML = lines.map((line) => `
    <li>
      <div><strong>${line.name}</strong><br><small>${formatPrice(line.total)}</small></div>
      <div class="controls">
        <button class="icon" data-id="${line.id}" data-step="-1" aria-label="Diminuir quantidade de ${line.name}">−</button>
        <span>${line.quantity} ${line.unit}</span>
        <button class="icon" data-id="${line.id}" data-step="1" aria-label="Aumentar quantidade de ${line.name}">+</button>
      </div>
    </li>
  `).join('');
}

function changeQuantity(id, step) {
  const product = products.find((item) => item.id === id);
  const quantity = (basket.get(id) || 0) + step;
  if (quantity > 99) {
    byId('feedback').textContent = 'Limite de 99 por produto.';
    return;
  }

  if (quantity > 0) basket.set(id, quantity);
  else basket.delete(id);

  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(basket)));
  } catch {
    // Keep the current basket in memory for this visit.
  }

  renderCart();
  byId('copy-status').textContent = '';
  byId('feedback').textContent = quantity
    ? `${product.name}: ${quantity} ${product.unit} na cesta.`
    : `${product.name} removido da cesta.`;
}

for (const name of categories) {
  const button = document.createElement('button');
  button.textContent = name;
  button.setAttribute('aria-pressed', String(name === category));
  button.addEventListener('click', () => {
    category = name;
    byId('filters').querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    renderProducts();
  });
  byId('filters').append(button);
}

byId('search').addEventListener('input', renderProducts);
byId('products').addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (button) changeQuantity(button.dataset.add, 1);
});
byId('open-cart').addEventListener('click', () => cart.showModal());
byId('cart-items').addEventListener('click', (event) => {
  const button = event.target.closest('[data-step]');
  if (!button) return;
  const { id, step } = button.dataset;
  changeQuantity(id, Number(step));
  const replacement = cart.querySelector(`[data-id="${id}"][data-step="${step}"]`) ||
    cart.querySelector('[data-step]') || cart.querySelector('form button');
  replacement.focus();
});
byId('copy').addEventListener('click', async () => {
  const lines = cartLines();
  const summary = [
    'Minha cesta · Feira Verde',
    ...lines.map((line) => `${line.quantity} ${line.unit} — ${line.name} — ${formatPrice(line.total)}`),
    `Subtotal: ${formatPrice(lines.reduce((sum, line) => sum + line.total, 0))}`,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(summary);
    byId('copy-status').textContent = 'Lista copiada.';
  } catch {
    byId('copy-status').textContent = 'O navegador bloqueou a cópia da lista.';
  }
});

renderProducts();
renderCart();
