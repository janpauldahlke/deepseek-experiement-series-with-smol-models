/**
 * Core task management logic.
 * Provides add, list, done, and rm operations on an in-memory task store.
 */

class TaskManager {
  constructor() {
    this.tasks = [];
    this.nextId = 1;
  }

  /** Add a new task with the given text. Returns the task id. */
  add(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('Task text must be a non-empty string');
    }
    const task = {
      id: this.nextId++,
      text: text.trim(),
      done: false,
      createdAt: new Date().toISOString()
    };
    this.tasks.push(task);
    return task.id;
  }

  /** Return all tasks, optionally filtered by done status. */
  list(filter = 'all') {
    if (filter === 'all' || filter === 'pending' || filter === 'done') {
      if (filter === 'pending') {
        return this.tasks.filter(t => !t.done);
      }
      if (filter === 'done') {
        return this.tasks.filter(t => t.done);
      }
      return [...this.tasks];
    }
    throw new Error(`Invalid filter: ${filter}. Use 'all', 'pending', or 'done'.`);
  }

  /** Mark a task as done by id. Returns the updated task or null. */
  done(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    task.done = true;
    task.doneAt = new Date().toISOString();
    return task;
  }

  /** Remove a task by id. Returns the removed task or null. */
  rm(id) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }
    return this.tasks.splice(index, 1)[0];
  }

  /** Get a single task by id. Returns null if not found. */
  get(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  /** Get task count */
  count(filter = 'all') {
    return this.list(filter).length;
  }
}

module.exports = TaskManager;