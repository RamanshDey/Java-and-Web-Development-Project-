# Smart Task Management System

Full-stack web application for managing personal tasks with authentication, priorities, deadlines, search, filters, completion status, and MongoDB storage.

## Features

- User registration and login
- JWT-protected dashboard
- Create, view, edit, delete, and complete tasks
- Task title, description, deadline, priority, and status
- Search by title or description keyword
- Filter by Pending/Completed status and High/Medium/Low priority
- Responsive frontend built with HTML, CSS, and JavaScript
- REST API built with Node.js, Express, and MongoDB

## Project Structure

```text
smart-task-management-system/
  public/
    css/styles.css
    js/app.js
    index.html
  src/
    config/db.js
    middleware/auth.js
    models/Task.js
    models/User.js
    routes/auth.js
    routes/tasks.js
  .env.example
  package.json
  server.js
```

## Setup

1. Install dependencies.

```bash
npm install
```

2. Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

3. Update `.env` if needed.

```text
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart-task-management
JWT_SECRET=replace-this-with-a-long-random-secret
```

4. Start MongoDB locally, then run the application.

```bash
npm start
```

The app will open at:

```text
http://localhost:5000
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Log in and receive a JWT |
| GET | `/api/auth/me` | Get current logged-in user |
| GET | `/api/tasks` | Get tasks with optional search/status/priority filters |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| PATCH | `/api/tasks/:id/complete` | Toggle Pending/Completed |
| DELETE | `/api/tasks/:id` | Delete a task |

## Notes

- The `.env` file is intentionally not included in version control.
- Keep `JWT_SECRET` private in real deployments.
- The frontend is served by Express from the `public` folder.
