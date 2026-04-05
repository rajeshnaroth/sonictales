---
name: stop
description: Stop the SonicTales dev server
user_invocable: true
---

Stop the Vite dev server by running `lsof -ti:3000 | xargs kill 2>/dev/null` using the Bash tool. Tell the user the server has been stopped.
