/**
 * Persistence module for tasks.
 * Loads and saves task data to/from a JSON file.
 */

const fs = require('fs');
const path = require('path');
const TaskManager = require('./tasks');

const DEFAULT_DATA_PATH = path.join(__dirname, '..', 'data', 'tasks.json');

/**
 * Load tasks from a JSON file and return a populated TaskManager.
 * Creates the file with empty array if it doesn't exist.
 * Ensures data directory exists.
 */
function load(dataPath = DEFAULT_DATA_PATH) {
  // Ensure data directory exists
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let tasksData = [];
  if (!fs.existsSync(dataPath)) {
    // Create empty tasks file
    fs.writeFileSync(dataPath, JSON.stringify({ tasks: [], nextId: 1 }, null, 2));
  } else {
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    tasksData = parsed.tasks || [];
  }

  const manager = new TaskManager();
  // Restore tasks: manually reconstruct state
  for (const t of tasksData) {
    const entry = {
      id: t.id,
      text: t.text,
      done: t.done || false,
      createdAt: t.createdAt,
      doneAt: t.doneAt || null
    };
    manager.tasks.push(entry);
    if (t.id >= manager.nextId) {
      manager.nextId = t.id + 1;
    }
  }

  return manager;
}

/**
 * Save all tasks from a TaskManager instance to the JSON file.
 */
function save(manager, dataPath = DEFAULT_DATA_PATH) {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data = {
    tasks: manager.tasks,
    nextId: manager.nextId
  };
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { load, save };