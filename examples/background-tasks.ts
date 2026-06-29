import { Rivex, BackgroundTasks, APIStatus } from 'rivex';

const auditLog: string[] = [];

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const app = new Rivex({ title: 'Background Tasks Example' });

app.post('/signup/{email}', async (ctx) => {
  const email = ctx.params.email;
  const tasks = new BackgroundTasks();

  tasks.addTask(async () => {
    await sleep(50);
    auditLog.push(`sent welcome email to ${email}`);
  });

  tasks.addTask(async () => {
    await sleep(20);
    auditLog.push(`provisioned workspace for ${email}`);
  });

  void tasks.runAll();

  return { status: 'accepted', email };
}, { statusCode: APIStatus.ACCEPTED });

app.get('/audit', async () => {
  return { log: [...auditLog] };
});

app.run('127.0.0.1', 8000);
