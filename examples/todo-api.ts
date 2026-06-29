import {
  Rivex,
  Router,
  HTTPException,
  CORSMiddleware,
} from 'rivex';

// ── Types ──

interface TodoCreate {
  title: string;
  completed?: boolean;
}

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// ── In-memory store ──

const db = new Map<number, Todo>();
let nextId = 1;

// ── App setup ──

const app = new Rivex({ title: 'Todo API', debug: true });
app.use(CORSMiddleware, { allowOrigins: ['*'] });

const router = new Router({ prefix: '/api/v1' });

// ── Routes ──

router.get('/todos', async () => {
  return Array.from(db.values());
});

router.get('/todos/{todoId}', async (ctx) => {
  const todoId = Number(ctx.params.todoId);
  const todo = db.get(todoId);
  if (!todo) {
    throw new HTTPException(404, 'Todo not found');
  }
  return todo;
});

router.post('/todos', async (ctx) => {
  const body = ctx.request.json<TodoCreate>();
  const todo: Todo = {
    id: nextId++,
    title: body.title,
    completed: body.completed ?? false,
  };
  db.set(todo.id, todo);
  return todo;
}, { statusCode: 201 });

router.put('/todos/{todoId}', async (ctx) => {
  const todoId = Number(ctx.params.todoId);
  if (!db.has(todoId)) {
    throw new HTTPException(404, 'Todo not found');
  }
  const body = ctx.request.json<TodoCreate>();
  const updated: Todo = {
    id: todoId,
    title: body.title,
    completed: body.completed ?? false,
  };
  db.set(todoId, updated);
  return updated;
});

router.delete('/todos/{todoId}', async (ctx) => {
  const todoId = Number(ctx.params.todoId);
  if (!db.has(todoId)) {
    throw new HTTPException(404, 'Todo not found');
  }
  db.delete(todoId);
  return null;
});

app.includeRouter(router);

// ── Health check ──

app.get('/health', async () => {
  return { status: 'ok' };
});

app.run('127.0.0.1', 8000);
