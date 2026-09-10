const express = require('express');
const path = require('path');
const TaskManager = require('./src/tasks');
const { load, save } = require('./src/persistence');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get task manager instance
function getManager() {
  const dataPath = path.join(__dirname, 'data', 'tasks.json');
  return load(dataPath);
}

function saveTasks(manager) {
  const dataPath = path.join(__dirname, 'data', 'tasks.json');
  save(manager, dataPath);
}

// REST API Endpoints

// GET /api/tasks - List all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const manager = getManager();
    const filter = req.query.filter; // 'all', 'pending', 'done'
    const tasks = manager.list(filter || 'all');
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id - Get a single task
app.get('/api/tasks/:id', (req, res) => {
  try {
    const manager = getManager();
    const id = parseInt(req.params.id, 10);
    const task = manager.get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'Task text is required and must be a non-empty string' });
    }
    const manager = getManager();
    const id = manager.add(text);
    saveTasks(manager);
    const task = manager.get(id);
    res.status(201).json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/tasks/:id/done - Mark a task as done
app.put('/api/tasks/:id/done', (req, res) => {
  try {
    const manager = getManager();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    const task = manager.done(id);
    saveTasks(manager);
    res.json({ task });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id - Remove a task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const manager = getManager();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    const task = manager.rm(id);
    saveTasks(manager);
    res.json({ task, deleted: true });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`TaskBox server running at http://localhost:${PORT}`);
  });
}

module.exports = { app, server };