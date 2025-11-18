# Universal Workflow Automation Engine

A lightweight, developer-friendly alternative to Zapier and N8N. Define workflows in YAML/JSON and execute them with built-in steps, custom plugins, and powerful automation capabilities.

## 🚀 Features

- **YAML/JSON Workflow Definition** - Define complex workflows in simple, readable formats
- **Built-in Steps** - HTTP requests, delays, loops, conditionals, email, JavaScript/TypeScript execution
- **Plugin System** - Extend functionality with custom steps
- **Web Dashboard** - Modern React-based UI for workflow management and monitoring
- **Real-time Execution Tracking** - Monitor workflow executions with live status updates
- **Visual Workflow Editor** - Create and edit workflows with syntax highlighting
- **Persistent Storage** - SQLite and Redis support for workflow runs
- **TypeScript First** - Full type safety and IntelliSense support
- **Developer Experience** - Hot reloading, debugging, and comprehensive logging

## 📦 Installation

```bash
npm install -g workflow-engine
```

Or use locally:
```bash
npm install workflow-engine
```

## 🎯 Quick Start

1. Create a workflow file `hello-world.yaml`:
```yaml
name: "Hello World Workflow"
description: "A simple example workflow"
version: "1.0.0"

steps:
  - name: "greet"
    type: "log"
    params:
      message: "Hello, World!"
  
  - name: "fetch-data"
    type: "http"
    params:
      url: "https://api.github.com/users/octocat"
      method: "GET"
  
  - name: "process-data"
    type: "script"
    params:
      language: "typescript"
      code: |
        const user = context.steps['fetch-data'].response.data;
        return {
          greeting: `Hello ${user.name}!`,
          followers: user.followers
        };
```

2. Run the workflow:
```bash
workflow-engine run hello-world.yaml
```

3. Start the web dashboard:
```bash
workflow-engine dashboard
```

## 🌐 Web Dashboard

The workflow engine includes a modern React-based web dashboard that provides:

### ✨ Dashboard Features

- **Workflow Management**
  - View all registered workflows in an organized grid layout
  - Execute workflows with a single click
  - Real-time execution status indicators
  - Workflow metadata display (name, description, version)

- **Visual Workflow Editor**
  - YAML syntax-highlighted editor
  - Built-in example templates to get started quickly
  - Instant workflow creation and validation
  - Clear and reset functionality for easy editing

- **Execution Monitoring**
  - Real-time execution list with status tracking
  - Detailed execution history and logs
  - Success/failure indicators with error details
  - Automatic refresh for live updates

- **Modern UI/UX**
  - Responsive design that works on desktop and mobile
  - Clean, intuitive interface built with React and TypeScript
  - Fast navigation with React Router
  - Interactive notifications for user feedback

### 🚀 Accessing the Dashboard

1. Start the dashboard server:
```bash
workflow-engine dashboard
```

2. Open your browser and navigate to `http://localhost:3000`

3. The dashboard will automatically connect to the workflow engine backend

### 🎨 Technology Stack

The frontend is built with modern web technologies:
- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety and developer experience
- **Vite** - Fast development server and optimized builds
- **React Router** - Client-side routing for SPA experience
- **Lucide React** - Beautiful, consistent icons
- **Axios** - HTTP client for API communication

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/your-username/workflow-engine
cd workflow-engine
```

2. Install all dependencies (backend + frontend):
```bash
npm run install:all
```

3. Build everything:
```bash
npm run build:all
```

### Development Commands

```bash
# Backend development
npm run dev                 # Start backend in watch mode
npm run build              # Build backend TypeScript
npm run test               # Run backend tests
npm run lint               # Lint backend code

# Frontend development  
npm run dev:frontend       # Start frontend dev server
npm run build:frontend     # Build frontend for production
npm run lint:frontend      # Lint frontend code

# Unified commands
npm run build:all          # Build both backend and frontend
npm run lint:all           # Lint both backend and frontend
npm run install:all        # Install dependencies for both projects
```

### Development Workflow

1. **Backend Development**: Run `npm run dev` to start the backend with hot reloading
2. **Frontend Development**: Run `npm run dev:frontend` to start the Vite dev server
3. **Full Stack**: Run both commands in separate terminals for full development experience

The frontend dev server (typically `http://localhost:5173`) will proxy API requests to the backend server.

## 📖 Documentation

- [Workflow Syntax](./docs/workflow-syntax.md)
- [Built-in Steps](./docs/built-in-steps.md)
- [Plugin Development](./docs/plugin-development.md)
- [API Reference](./docs/api-reference.md)
- [Frontend Development](./frontend/README.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
