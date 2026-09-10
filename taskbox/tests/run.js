#!/usr/bin/env node

/**
 * TaskBox Test Suite
 * Tests core task logic and CLI commands.
 * 
 * Run with: node tests/run.js
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Test data file (in /tmp to avoid polluting dev workspace)
const TEST_DATA_PATH = path.join('/tmp', 'taskbox-test-tasks.json');

let passed = 0;
let failed = 0;
const failures = [];

// ===== Assertion helpers =====

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    fail(`${message}\n  Expected function to throw, but it didn't.`);
  } catch (e) {
    passed++; // The test "passed" because it did throw
  }
}

function pass(message) {
  passed++;
  console.log(`  ✓ ${message}`);
}

function fail(message) {
  failed++;
  failures.push(message);
  console.log(`  ✗ ${message}`);
}

// ===== Test: Core TaskManager =====

function runCoreTests() {
  console.log('\n📦 Core TaskManager Tests');
  console.log('─'.repeat(50));

  // Load the TaskManager module directly
  const TaskManager = require('../src/tasks');

  // Test 1: Add a task
  const tm = new TaskManager();
  const id = tm.add('Test task');
  assertEquals(id, 1, 'Add first task returns id 1');
  pass('add: returns correct id');

  // Test 2: Add multiple tasks
  const id2 = tm.add('Second task');
  assertEquals(id2, 2, 'Add second task returns id 2');
  pass('add: auto-increments id');

  // Test 3: Add task with extra whitespace is trimmed
  const id3 = tm.add('  Trimmed task  ');
  assertEquals(tm.get(id3).text, 'Trimmed task', 'add: trims whitespace');
  pass('add: trims whitespace from task text');

  // Test 4: Add empty text throws
  assertThrows(() => tm.add(''), 'add: throws on empty text');
  pass('add: throws on empty text');

  // Test 5: Add null throws
  assertThrows(() => tm.add(null), 'add: throws on null');
  pass('add: throws on null');

  // Test 6: List all tasks
  assertEquals(tm.list('all').length, 3, 'list: returns all tasks');
  pass('list: returns all tasks');

  // Test 7: List pending (none done yet)
  assertEquals(tm.list('pending').length, 3, 'list: returns all as pending initially');
  pass('list: pending filter works');

  // Test 8: Mark task done
  tm.done(1);
  const task1 = tm.get(1);
  assert(task1.done, 'done: marks task as done');
  pass('done: marks task as done');

  // Test 9: List pending after done
  assertEquals(tm.list('pending').length, 2, 'list: pending count decreases');
  assertEquals(tm.list('done').length, 1, 'list: done count increases');
  pass('list: filters correctly after done');

  // Test 10: Remove task
  const removed = tm.rm(2);
  assertEquals(removed.text, 'Second task', 'rm: returns removed task');
  assertEquals(tm.list('all').length, 2, 'rm: removes from list');
  assert(tm.get(2) === null, 'rm: task is gone');
  pass('rm: removes task and returns it');

  // Test 11: Done on non-existent throws
  assertThrows(() => tm.done(999), 'done: throws on non-existent id');
  pass('done: throws on non-existent id');

  // Test 12: Rm on non-existent throws
  assertThrows(() => tm.rm(999), 'rm: throws on non-existent id');
  pass('rm: throws on non-existent id');

  // Test 13: Invalid filter throws
  assertThrows(() => tm.list('invalid'), 'list: throws on invalid filter');
  pass('list: throws on invalid filter');

  // Test 14: Count
  assertEquals(tm.count(), 2, 'count: returns total');
  assertEquals(tm.count('done'), 1, 'count: returns done count');
  assertEquals(tm.count('pending'), 1, 'count: returns pending count');
  pass('count: works with all filters');
}

// ===== Test: Persistence =====

function runPersistenceTests() {
  console.log('\n💾 Persistence Tests');
  console.log('─'.repeat(50));

  // Clean up test file
  if (fs.existsSync(TEST_DATA_PATH)) {
    fs.unlinkSync(TEST_DATA_PATH);
  }

  const { load, save } = require('../src/persistence');

  // Test 1: Load from non-existent file creates empty store
  const tm1 = load(TEST_DATA_PATH);
  assertEquals(tm1.count(), 0, 'load: creates empty store from missing file');
  assert(fs.existsSync(TEST_DATA_PATH), 'load: creates data file');
  pass('load: handles missing file gracefully');

  // Test 2: Save and reload
  tm1.add('Persistent task');
  tm1.add('Another persistent task');
  save(tm1, TEST_DATA_PATH);
  
  const tm2 = load(TEST_DATA_PATH);
  assertEquals(tm2.count(), 2, 'load: restores tasks after save');
  assertEquals(tm2.get(1).text, 'Persistent task', 'load: preserves task text');
  pass('save/load: round-trip preserves tasks');

  // Test 3: Add after load
  const id3 = tm2.add('New after load');
  assertEquals(id3, 3, 'add: next id continues after load');
  save(tm2, TEST_DATA_PATH);
  
  const tm3 = load(TEST_DATA_PATH);
  assertEquals(tm3.count(), 3, 'load: includes new task');
  pass('save/load: id counter persists');

  // Test 4: Done persists
  tm2.done(1);
  save(tm2, TEST_DATA_PATH);
  
  const tm4 = load(TEST_DATA_PATH);
  assert(tm4.get(1).done, 'done: persists done status');
  pass('save/load: done status persists');

  // Test 5: Rm persists
  tm2.rm(2);
  save(tm2, TEST_DATA_PATH);
  
  const tm5 = load(TEST_DATA_PATH);
  assert(tm5.get(2) === null, 'rm: persists removal');
  assertEquals(tm5.count(), 2, 'rm: count updated after load');
  pass('save/load: removal persists');

  // Cleanup
  if (fs.existsSync(TEST_DATA_PATH)) {
    fs.unlinkSync(TEST_DATA_PATH);
  }
}

// ===== Test: CLI =====

function runCLITests() {
  console.log('\n🖥️  CLI Tests');
  console.log('─'.repeat(50));

  // Ensure data dir for CLI tests
  const cliDataDir = path.dirname(TEST_DATA_PATH);
  if (!fs.existsSync(cliDataDir)) {
    fs.mkdirSync(cliDataDir, { recursive: true });
  }

  // Override the data path for CLI tests by symlinking / env
  // We'll use DATA_PATH env variable or just patch persistence
  
  // Actually, let's test CLI by running it and checking output
  // We need to use a separate data file for CLI tests
  
  // Test 1: No command shows help
  try {
    const output = execSync('node cli.js', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    // Should exit with code 1, so we won't reach here
    fail('no-args: should exit with error');
  } catch (e) {
    if (e.stdout && e.stdout.includes('Usage')) {
      pass('no args: shows usage');
    } else {
      pass('no args: exits with non-zero code');
    }
  }

  // Test 2: Add task
  try {
    const output = execSync(`node cli.js add "Test CLI task"`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    assert(output.includes('added'), 'add: shows confirmation');
    assert(output.includes('#1'), 'add: shows task id');
    pass('add: adds task and shows confirmation');
  } catch (e) {
    fail(`add: CLI error - ${e.message}`);
  }

  // Test 3: List tasks
  try {
    execSync(`node cli.js add "Second CLI task"`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    
    const output = execSync('node cli.js list', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    assert(output.includes('Test CLI task'), 'list: shows tasks');
    assert(output.includes('Total'), 'list: shows count');
    pass('list: displays tasks and count');
  } catch (e) {
    fail(`list: CLI error - ${e.message}`);
  }

  // Test 4: Mark done
  try {
    const output = execSync('node cli.js done 1', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    assert(output.includes('done'), 'done: shows confirmation');
    pass('done: marks task as done');
  } catch (e) {
    fail(`done: CLI error - ${e.message}`);
  }

  // Test 5: Remove task
  try {
    const output = execSync('node cli.js rm 2', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    assert(output.includes('removed'), 'rm: shows confirmation');
    pass('rm: removes task');
  } catch (e) {
    fail(`rm: CLI error - ${e.message}`);
  }

  // Test 6: Unknown command
  try {
    execSync('node cli.js unknown', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, TASKBOX_DATA: TEST_DATA_PATH }
    });
    fail('unknown command: should exit with error');
  } catch (e) {
    pass('unknown command: exits with non-zero code');
  }

  // Cleanup
  if (fs.existsSync(TEST_DATA_PATH)) {
    fs.unlinkSync(TEST_DATA_PATH);
  }
}

// ===== Main test runner =====

console.log('╔══════════════════════════════════════════╗');
console.log('║          TaskBox Test Suite              ║');
console.log('╚══════════════════════════════════════════╝');

runCoreTests();
runPersistenceTests();
runCLITests();

// Summary
console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failed > 0) {
  console.log('\n❌ Failures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('\n❌ Tests FAILED');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}