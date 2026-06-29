import { Rivex, HTTPBearer, HTTPException, APIStatus } from 'rivex';
import type { Context } from 'rivex';

const users: Record<string, { id: number; name: string; role: string }> = {
  'demo-token':  { id: 1, name: 'Ada',   role: 'admin'  },
  'guest-token': { id: 2, name: 'Guest', role: 'viewer' },
};

const bearer = new HTTPBearer();

function currentUser(ctx: Context) {
  const creds = bearer.resolve(ctx);
  if (!creds) {
    throw new HTTPException(APIStatus.UNAUTHORIZED, 'Missing bearer token');
  }
  const user = users[creds.credentials];
  if (!user) {
    throw new HTTPException(APIStatus.UNAUTHORIZED, 'Invalid bearer token');
  }
  return user;
}

const app = new Rivex({ title: 'Auth Bearer Example' });

app.get('/public', async () => {
  return { message: 'anyone can see this' };
});

app.get('/me', async (ctx) => {
  return currentUser(ctx);
});

app.get('/admin', async (ctx) => {
  const user = currentUser(ctx);
  if (user.role !== 'admin') {
    throw new HTTPException(APIStatus.FORBIDDEN, 'Admins only');
  }
  return { message: 'welcome to the admin panel', user };
});

app.run('127.0.0.1', 8000);
