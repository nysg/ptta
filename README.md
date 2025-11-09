# ptta (Project, Task, Todo, Action)

AI-first Task Management CLI - External Memory for Claude Code

**Current Implementation**: Project → Task → Subtask hierarchy

## Features

- 📋 **Hierarchical Task Management**: Project → Task → Subtask
- 🤖 **AI-Optimized**: Structured JSON data, designed for easy Claude Code integration
- 💾 **Persistent Storage**: Fast data management with better-sqlite3
- 📁 **Workspace-based**: Independent project management per workspace path
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

### Project Management

```bash
# Create project
ptta project:add "Web App Development" -d "New web application project" -P high

# List projects
ptta project:list

# Show project details (hierarchical view)
ptta project:show 1
```

### Task Management

```bash
# Create task
ptta task:add 1 "Implement authentication" -d "Implement JWT authentication" -P high

# List tasks
ptta task:list

# List tasks for project 1
ptta task:list -P 1

# Update task status
ptta task:update 1 -s in_progress

# Complete task
ptta task:update 1 -s done
```

### Subtask Management

```bash
# Add subtasks
ptta subtask:add 1 "Create login UI"
ptta subtask:add 1 "Implement JWT generation logic"

# Complete subtask
ptta subtask:done 1
```

### Workspace Management

```bash
# List workspaces
ptta workspace:list

# Execute in specific workspace
ptta -p /path/to/project project:list
```

### Data Export

```bash
# Export all data as JSON
ptta export

# Export specific project to file
ptta export -P 1 -o project1.json

# Show statistics
ptta stats
```

## Claude Code Integration

### 1. Check current tasks at work start

```bash
# Get in-progress tasks in JSON format
ptta query tasks -s in_progress
```

### 2. Understand project overview

```bash
# Get project hierarchy in JSON format
ptta query hierarchy -i 1
```

### 3. Record work completion

```bash
# Complete task and add summary
ptta task:update 5 -s done
ptta summary:add task 5 "API integration completed. Implemented error handling and rate limiting."
```

### 4. AI Query Commands (JSON format)

```bash
# All projects
ptta query projects

# All tasks
ptta query tasks

# Specific project hierarchy
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

### Projects

- `active`: Active (in progress)
- `completed`: Completed
- `archived`: Archived

### Tasks/Subtasks

- `todo`: Not started
- `in_progress`: In progress
- `done`: Completed

## Priority Levels

- `low`: Low
- `medium`: Medium (default)
- `high`: High

## License

MIT
