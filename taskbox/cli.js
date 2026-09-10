#!/usr/bin/env node

/**
 * TaskBox CLI - A simple command-line task manager.
 * 
 * Commands:
 *   add <text>    Add a new task
 *   list          List all tasks
 *   done <id>     Mark a task as done
 *   rm <id>       Remove a task
 */

const path = require('path');
const { load, save } = require('./src/persistence');

// Resolve data file path
const dataPath = path.join(__dirname, 'data', 'tasks.json');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  printUsage();
  process.exit(1);
}

switch (command) {
  case 'add': {
    const text = args.slice(1).join(' ');
    if (!text) {
      console.error('Error: Please provide task text.');
      console.error('Usage: taskbox add <text>');
      process.exit(1);
    }
    const manager = load(dataPath);
    const id = manager.add(text);
    save(manager, dataPath);
    console.log(`Task #${id} added: "${text}"`);
    break;
  }

  case 'list': {
    const manager = load(dataPath);
    const tasks = manager.list('all');
    
    if (tasks.length === 0) {
      console.log('No tasks. Add one with: taskbox add <text>');
    } else {
      // Group by done/pending
      const pending = tasks.filter(t => !t.done);
      const done = tasks.filter(t => t.done);
      
      if (pending.length > 0) {
        console.log('\nPending:');
        pending.forEach(t => {
          console.log(`  [#${t.id}] ${t.text}`);
        });
      }
      
      if (done.length > 0) {
        console.log('\nDone:');
        done.forEach(t => {
          console.log(`  [#${t.id}] ✅ ${t.text}`);
        });
      }
      
      console.log(`\nTotal: ${tasks.length} task(s) (${done.length} done, ${pending.length} pending)`);
    }
    break;
  }

  case 'done': {
    const id = parseInt(args[1], 10);
    if (isNaN(id)) {
      console.error('Error: Please provide a valid task ID.');
      console.error('Usage: taskbox done <id>');
      process.exit(1);
    }
    const manager = load(dataPath);
    const task = manager.done(id);
    save(manager, dataPath);
    console.log(`Task #${id} marked as done: "${task.text}"`);
    break;
  }

  case 'rm': {
    const id = parseInt(args[1], 10);
    if (isNaN(id)) {
      console.error('Error: Please provide a valid task ID.');
      console.error('Usage: taskbox rm <id>');
      process.exit(1);
    }
    const manager = load(dataPath);
    const task = manager.rm(id);
    save(manager, dataPath);
    console.log(`Task #${id} removed: "${task.text}"`);
    break;
  }

  case 'help': {
    printUsage();
    break;
  }

  default:
    console.error(`Error: Unknown command "${command}".`);
    printUsage();
    process.exit(1);
}

function printUsage() {
  console.log(`
TaskBox - A simple CLI task manager

Usage:
  taskbox add <text>    Add a new task
  taskbox list          List all tasks
  taskbox done <id>     Mark a task as done
  taskbox rm <id>       Remove a task
  taskbox help          Show this help message

Examples:
  taskbox add "Buy groceries"
  taskbox add "Write tests"
  taskbox list
  taskbox done 1
  taskbox rm 1
`);
}