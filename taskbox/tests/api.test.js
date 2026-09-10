const request = require('supertest');
const { app } = require('../server');
const { resetData } = require('./setup');

// Reset data to clean state before all tests
beforeAll(() => {
  resetData();
});

const agent = request.agent(app);

describe('TaskBox API', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await agent
        .post('/api/tasks')
        .send({ text: 'Test task 1' });
      expect(res.status).toBe(201);
      expect(res.body.task).toBeDefined();
      expect(res.body.task.text).toBe('Test task 1');
      expect(res.body.task.done).toBe(false);
      expect(res.body.task.id).toBe(1);
    });

    it('should create another task with id 2', async () => {
      const res = await agent
        .post('/api/tasks')
        .send({ text: 'Test task 2' });
      expect(res.status).toBe(201);
      expect(res.body.task.id).toBe(2);
    });

    it('should reject empty text', async () => {
      const res = await agent
        .post('/api/tasks')
        .send({ text: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject missing text', async () => {
      const res = await agent.post('/api/tasks').send({});
      expect(res.status).toBe(400);
    });

    it('should trim whitespace from text', async () => {
      const res = await agent
        .post('/api/tasks')
        .send({ text: '   Whitespace test   ' });
      expect(res.status).toBe(201);
      expect(res.body.task.text).toBe('Whitespace test');
    });
  });

  describe('GET /api/tasks', () => {
    it('should list all tasks', async () => {
      const res = await agent.get('/api/tasks');
      expect(res.status).toBe(200);
      expect(res.body.tasks).toBeDefined();
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by pending', async () => {
      const res = await agent.get('/api/tasks?filter=pending');
      expect(res.status).toBe(200);
      expect(res.body.tasks.every(t => !t.done)).toBe(true);
    });

    it('should filter by done', async () => {
      // First mark a task as done
      await agent.put('/api/tasks/1/done');
      const res = await agent.get('/api/tasks?filter=done');
      expect(res.status).toBe(200);
      expect(res.body.tasks.every(t => t.done)).toBe(true);
    });

    it('should filter by all', async () => {
      const res = await agent.get('/api/tasks?filter=all');
      expect(res.status).toBe(200);
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get a single task', async () => {
      const res = await agent.get('/api/tasks/1');
      expect(res.status).toBe(200);
      expect(res.body.task.text).toBe('Test task 1');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await agent.get('/api/tasks/9999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PUT /api/tasks/:id/done', () => {
    it('should mark a task as done', async () => {
      // Add a fresh task first
      const addRes = await agent.post('/api/tasks').send({ text: 'To be done' });
      const id = addRes.body.task.id;
      
      const res = await agent.put(`/api/tasks/${id}/done`);
      expect(res.status).toBe(200);
      expect(res.body.task.done).toBe(true);
      expect(res.body.task.doneAt).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await agent.put('/api/tasks/9999/done');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should remove a task', async () => {
      // Add a task to delete
      const addRes = await agent.post('/api/tasks').send({ text: 'To be deleted' });
      const id = addRes.body.task.id;
      
      const res = await agent.delete(`/api/tasks/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(res.body.task.text).toBe('To be deleted');
    });

    it('should remove a task from the list', async () => {
      const addRes = await agent.post('/api/tasks').send({ text: 'Gone task' });
      const id = addRes.body.task.id;
      
      await agent.delete(`/api/tasks/${id}`);
      const listRes = await agent.get('/api/tasks');
      const remaining = listRes.body.tasks.filter(t => t.id === id);
      expect(remaining).toHaveLength(0);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await agent.delete('/api/tasks/9999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await agent.get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeDefined();
    });
  });
});