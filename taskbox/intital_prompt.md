phase1:

Create a new project `taskbox` in the current directory.

Requirements:

- CLI: add <text>, list, done <id>, rm <id>
- Persist tasks to ./data/tasks.json
- Include a test suite; keep running tests and fixing until all pass
- Add a short README with exact commands to install and run
- Do not ask me questions; make reasonable choices and finish

Stop only when tests pass and README is written.

done after:
Usage 374K tok
Ran for 1m 45s
09:43

phase2:

Upgrade taskbox into a tiny full-stack app in this repo.
Server:

- REST API for tasks (CRUD + mark done)
- Persist to a local file or SQLite
- Include API tests; keep fixing until they pass

  Client:

- Simple UI (one page is fine) that talks to the API
- Show list, add task, mark done, delete
- No auth, no fancy styling required
  README:
- How to start server + open UI
- Example curl calls
  Do not ask questions. Make choices and finish when API tests pass and README is accurate.
