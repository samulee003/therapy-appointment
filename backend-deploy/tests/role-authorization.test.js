const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3');

process.env.JWT_SECRET = 'test-only-secret';
const jwt = require('jsonwebtoken');
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');

test('public registration and user updates cannot grant privileged roles', async (t) => {
  const db = new sqlite3.Database(':memory:');
  await new Promise((resolve, reject) => db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT, email TEXT, username TEXT, password TEXT, role TEXT, phone TEXT,
      created_at TEXT, updated_at TEXT
    )
  `, (err) => err ? reject(err) : resolve()));
  t.after(() => new Promise((resolve, reject) => db.close((err) => err ? reject(err) : resolve())));

  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/auth', authRoutes(db));
  app.use('/users', userRoutes(db));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method, body, token) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  const register = (email, role) => request('/auth/register', 'POST', {
    name: 'Patient', email, password: 'password123', ...(role === undefined ? {} : { role })
  });

  for (const role of ['admin', 'doctor', null, '']) {
    const result = await register(`${String(role)}@example.test`, role);
    assert.equal(result.status, 403);
  }
  const registered = await register('patient@example.test');
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.role, 'patient');
  const explicitPatient = await register('another@example.test', 'patient');
  assert.equal(explicitPatient.status, 201);
  const id = registered.body.user.id;
  const token = jwt.sign({ id, role: 'patient' }, process.env.JWT_SECRET);
  const adminToken = jwt.sign({ id: 100, role: 'admin' }, process.env.JWT_SECRET);

  const denied = await request(`/users/${id}`, 'PUT', { name: 'Changed', role: 'admin' }, token);
  assert.equal(denied.status, 403);
  const user = await new Promise((resolve, reject) =>
    db.get('SELECT name, role FROM users WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row)));
  assert.deepEqual(user, { name: 'Patient', role: 'patient' });

  const updated = await request(`/users/${id}`, 'PUT', { name: 'Changed' }, token);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.name, 'Changed');
  assert.equal(updated.body.user.role, 'patient');
  const invalid = await request(`/users/${id}`, 'PUT', { role: 'superuser' }, adminToken);
  assert.equal(invalid.status, 400);
  const promoted = await request(`/users/${id}`, 'PUT', { role: 'doctor' }, adminToken);
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.user.role, 'doctor');

  const count = await new Promise((resolve, reject) =>
    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => err ? reject(err) : resolve(row.count)));
  assert.equal(count, 2);
});
