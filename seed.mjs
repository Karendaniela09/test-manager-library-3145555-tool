import { randomInt } from 'node:crypto';

const baseUrl = (process.env.API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('Defina ADMIN_USERNAME y ADMIN_PASSWORD en el entorno.');
}

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body?.code || 'ERROR'} — ${body?.message || 'Solicitud fallida'}`);
  }
  return body;
}

const login = await request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
});
const token = login.access_token;
const categories = await request('/categories', { token });
if (categories.length !== 5) throw new Error('La API no devolvió las cinco categorías configuradas.');

const runId = Date.now().toString(36).toUpperCase();
const books = [];
for (let index = 0; index < 40; index += 1) {
  const isbn = `978${randomInt(0, 10_000_000_000).toString().padStart(10, '0')}`;
  books.push(await request('/books', {
    token,
    method: 'POST',
    body: JSON.stringify({
      title: `Libro de demostración ${runId}-${String(index + 1).padStart(2, '0')}`,
      author: `Autor de demostración ${index + 1}`,
      isbn,
      category_id: categories[index % categories.length].id,
      total_copies: 3,
    }),
  }));
}

const members = [];
for (let index = 0; index < 10; index += 1) {
  members.push(await request('/members', {
    token,
    method: 'POST',
    body: JSON.stringify({
      full_name: `Socio de demostración ${String(index + 1).padStart(2, '0')}`,
      document_number: `DEMO-${runId}-${String(index + 1).padStart(2, '0')}`,
    }),
  }));
}

for (let index = 0; index < 15; index += 1) {
  await request('/loans', {
    token,
    method: 'POST',
    body: JSON.stringify({
      member_id: members[index % members.length].id,
      items: [{ book_id: books[index].id }],
    }),
  });
}

console.log('Datos creados exclusivamente por la API: 40 libros, 10 socios y 15 préstamos.');
console.warn('El contrato fija vencimiento a 14 días y no permite backdating; crear vencidos por API no es posible sin ampliar la especificación.');
