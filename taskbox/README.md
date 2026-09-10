# TaskBox

A tiny full-stack task manager — REST API + single-page UI. No database, no framework dependencies, zero external CSS.

## Install

```bash
cd taskbox
npm install
```

That's it — only two runtime deps (Express for the server, Supertest+Jest for tests).

## Start the Server

```bash
npm start
```

Server boots on **http://localhost:3000**. Open that URL in a browser to see the UI.

## Using the UI

The single-page app at http://localhost:3000 provides:

- **Add** a task — type in the input and press Enter or click Add
- **List** tasks — shows all, with Pending and Done sections
- **Filter** — toggle between All / Pending / Done views
- **Mark done** — click the checkbox next to any task
- **Delete** — click the ✕ button on any task

## API Endpoints

Base URL: `http://localhost:3000`

### List tasks

```bash
curl http://localhost:3000/api/tasks
```

Filter by status:

```bash
curl "http://localhost:3000/api/tasks?filter=pending"
curl "http://localhost:3000/api/tasks?filter=done"
```

### Get a single task

```bash
curl http://localhost:3000/api/tasks/1
```

### Create a task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy groceries"}'
```

### Mark a task as done

```bash
curl -X PUT http://localhost:3000/api/tasks/1/done
```

### Delete a task

```bash
curl -X DELETE http://localhost:3000/api/tasks/1
```

### Health check

```bash
curl http://localhost:3000/api/health
```

## Run Tests

```bash
npm test           # API tests (Jest + Supertest, 17 tests)
npm run test:cli   # Legacy CLI tests (30 tests)
```

## Data

Tasks are persisted to `data/tasks.json` on every mutation. To reset, delete that file and restart the server.

## Project Structure

```
taskbox/
├── server.js              # Express server + REST API
├── public/
│   └── index.html         # Single-page UI (vanilla HTML/CSS/JS)
├── src/
│   ├── tasks.js           # Core TaskManager class (add, list, done, rm)
│   └── persistence.js     # JSON file load/save
├── data/
│   └── tasks.json         # Persistent task storage (auto-created)
├── tests/
│   ├── api.test.js        # API integration tests (17 tests)
│   ├── setup.js           # Test helpers (data reset)
│   └── run.js             # CLI tests (30 tests)
├── package.json
└── README.md
```

## CLI (v1 — still works)

The original CLI-only mode is preserved in `cli.js`:

```bash
node cli.js add "Buy groceries"
node cli.js list
node cli.js done 1
node cli.js rm 1
```