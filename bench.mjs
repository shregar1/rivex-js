import { Rivex } from './dist/index.js';

const app = new Rivex();

app.get('/', (ctx) => {
  return { message: 'Hello, World!' };
});

app.get('/json', (ctx) => {
  return { framework: 'rivex', language: 'typescript', data: Array.from({length: 10}, (_, i) => i) };
});

app.get('/plaintext', (ctx) => {
  return 'Hello, World!';
});

app.run('127.0.0.1', 3003);
