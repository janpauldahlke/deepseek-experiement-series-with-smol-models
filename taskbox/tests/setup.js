/**
 * Reset the tasks data file to a clean state.
 * Called by Jest before each test file.
 */
const path = require('path');
const fs = require('fs');

function resetData() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dataPath = path.join(dataDir, 'tasks.json');
  fs.writeFileSync(dataPath, JSON.stringify({ tasks: [], nextId: 1 }, null, 2), 'utf-8');
}

function getDataPath() {
  return path.join(__dirname, '..', 'data', 'tasks.json');
}

module.exports = { resetData, getDataPath };