# ptta (Project, Task, Todo, Action)

AI-first Task Management CLI - External Memory for Claude Code

**Current Implementation**: Workspace → Task → Todo → Action hierarchy (4 layers)

## Features

- 📋 **Hierarchical Task Management**: Workspace → Task → Todo → Action
- 🤖 **AI-Optimized**: Structured JSON data, designed for easy Claude Code integration
- 💾 **Persistent Storage**: Fast data management with better-sqlite3
- 📁 **Workspace-based**: Independent task management per workspace path
- 🔍 **Efficient Queries**: Save Claude Code's context window
- 🌐 **Web Interface**: Visual task management via WebUI

## Installation

```bash
npm install -g @nysg/ptta
```

### Local Development

```bash
npm install
npm run build
npm link
```

## WebUI

Launch the web interface to manage your tasks visually.

```bash
# Start WebUI (default port: 3737)
ptta web

# Custom port
ptta web --port 8080
```

Open <http://localhost:3737> in your browser.

## Basic Usage

### Task Management

```bash
# Create task
ptta task:add "Web App Development" -d "New web application project" -P high

# List tasks
ptta task:list

# Show task details (hierarchical view with todos and actions)
ptta task:show 1

# Update task status
ptta task:update 1 -s completed
```

### Todo Management

```bash
# Create todo for task 1
ptta todo:add 1 "Implement authentication" -d "Implement JWT authentication" -P high

# List all todos
ptta todo:list

# List todos for task 1
ptta todo:list -T 1

# Update todo status
ptta todo:update 1 -s in_progress

# Complete todo
ptta todo:update 1 -s done
```

### Action Management

```bash
# Add actions to todo 1
ptta action:add 1 "Create login UI"
ptta action:add 1 "Implement JWT generation logic"

# Complete action
ptta action:done 1

# Update action
ptta action:update 1 -s done
```

### Workspace Management

```bash
# List workspaces
ptta workspace:list

# Execute in specific workspace
ptta -p /path/to/project task:list
```

### Data Export

```bash
# Export all data as JSON
ptta export

# Export specific task to file
ptta export -T 1 -o task1.json

# Show statistics
ptta stats
```

## Claude Code Integration

### 1. Check current todos at work start

```bash
# Get in-progress todos in JSON format
ptta query todos -s in_progress
```

### 2. Understand task overview

```bash
# Get task hierarchy (with todos and actions) in JSON format
ptta query hierarchy -i 1
```

### 3. Record work completion

```bash
# Complete todo and add summary
ptta todo:update 5 -s done
ptta summary:add todo 5 "API integration completed. Implemented error handling and rate limiting."
```

### 4. AI Query Commands (JSON format)

```bash
# All tasks
ptta query tasks

# All todos
ptta query todos

# Specific task hierarchy (includes all todos and actions)
ptta query hierarchy -i 1

# All data
ptta query all

# Statistics
ptta query stats

# Workspace list
ptta query workspaces
```

## Data Storage Location

```
~/.ptta/ptta.db
```

## Status Values

### Tasks

- `active`: Active (in progress)
- `completed`: Completed
- `archived`: Archived

### Todos/Actions

- `todo`: Not started
- `in_progress`: In progress
- `done`: Completed

## Priority Levels

- `low`: Low
- `medium`: Medium (default)
- `high`: High

## License

MIT
