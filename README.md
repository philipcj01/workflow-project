<div align="center">

# 🔄 Universal Workflow Automation Engine

*A lightning-fast, developer-friendly alternative to Zapier and N8N*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [💻 Demo](#-live-demo) • [🤝 Contributing](#-contributing)**

---

*Define complex workflows in simple YAML/JSON • Execute with built-in steps and custom plugins • Monitor with a beautiful React dashboard*

</div>

## ✨ What Makes It Special?

<table>
<tr>
<td width="50%">

### 🎯 **Developer First**
- **YAML/JSON Configuration** - Human-readable workflow definitions
- **TypeScript Native** - Full type safety and IntelliSense
- **Hot Reloading** - Instant feedback during development
- **Rich CLI Tools** - Command-line workflow management

</td>
<td width="50%">

### 🚀 **Production Ready**
- **Real-time Monitoring** - Live execution tracking
- **Persistent Storage** - SQLite with optional Redis
- **Error Handling** - Comprehensive logging and debugging
- **Scalable Architecture** - Plugin system for extensibility

</td>
</tr>
</table>


## 🚀 Quick Start

### ⚡ One-Command Setup

```bash
# Install globally
npm install -g workflow-engine

# Or clone and develop locally
git clone https://github.com/your-username/workflow-engine.git
cd workflow-engine
npm run install:all
```

### 🎯 Create Your First Workflow

<details>
<summary>📝 <strong>1. Create a workflow file</strong> <code>my-first-workflow.yaml</code></summary>

```yaml
name: "API Data Pipeline"
description: "Fetch GitHub user data and process it"
version: "1.0.0"

variables:
  username: "octocat"

steps:
  - name: "fetch-user"
    type: "http"
    params:
      url: "https://api.github.com/users/${variables.username}"
      method: "GET"
      headers:
        User-Agent: "WorkflowEngine/1.0"

  - name: "process-data"
    type: "script"
    params:
      language: "typescript"
      code: |
        const user = context.steps['fetch-user'].response.data;
        console.log(`Processing data for ${user.name}`);
        
        return {
          summary: `${user.name} has ${user.public_repos} repos and ${user.followers} followers`,
          avatar: user.avatar_url,
          profile: user.html_url
        };

  - name: "log-result"
    type: "log"
    params:
      message: "${steps.process-data.data.summary}"
      level: "info"
```

</details>

<details>
<summary>🚀 <strong>2. Run the workflow</strong></summary>

```bash
# Execute workflow
workflow-engine run my-first-workflow.yaml

# Or with custom variables
workflow-engine run my-first-workflow.yaml --var username=your-github-username
```

</details>

<details>
<summary>🌐 <strong>3. Start the web dashboard</strong></summary>

```bash
# Start the dashboard server
workflow-engine dashboard

# Open in browser
open http://localhost:3000
```

</details>

## 🔧 Built-in Step Types

<div align="center">

| Step Type | Description | Example Use Case |
|:---:|:---|:---|
| 🌐 **HTTP** | Make REST API calls | Fetch data, webhook notifications |
| ⏰ **Wait** | Add delays between steps | Rate limiting, scheduled execution |
| 📝 **Log** | Output messages and data | Debugging, progress tracking |
| 🔀 **Conditional** | Branch execution logic | Dynamic workflow paths |
| 📧 **Email** | Send notifications | Alerts, reports, confirmations |
| 💻 **Script** | Execute JavaScript/TypeScript | Data transformation, custom logic |

</div>

## 🌟 Advanced Features

### 🔄 Complex Workflow Example

<details>
<summary><strong>E-commerce Order Processing Pipeline</strong></summary>

```yaml
name: "E-commerce Order Processing"
description: "Complete order fulfillment workflow"
version: "2.0.0"

variables:
  order_id: "${input.orderId}"
  customer_email: "${input.customerEmail}"

steps:
  - name: "validate-order"
    type: "http"
    params:
      url: "https://api.shop.com/orders/${variables.order_id}"
      method: "GET"
      headers:
        Authorization: "Bearer ${env.API_TOKEN}"

  - name: "check-inventory"
    type: "script"
    params:
      language: "typescript"
      code: |
        const order = context.steps['validate-order'].response.data;
        const inventoryCheck = await checkInventory(order.items);
        
        if (!inventoryCheck.available) {
          throw new Error(`Insufficient inventory for order ${order.id}`);
        }
        
        return { status: 'available', items: order.items };

  - name: "process-payment"
    type: "http"
    condition: "${steps.check-inventory.data.status} === 'available'"
    params:
      url: "https://payments.stripe.com/charges"
      method: "POST"
      body:
        amount: "${steps.validate-order.data.total}"
        currency: "usd"

  - name: "send-confirmation"
    type: "email"
    params:
      to: "${variables.customer_email}"
      subject: "Order Confirmed - #${variables.order_id}"
      template: "order-confirmation"
      data:
        order: "${steps.validate-order.data}"
        payment: "${steps.process-payment.data}"

  - name: "update-inventory"
    type: "http"
    params:
      url: "https://api.shop.com/inventory/update"
      method: "POST"
      body: "${steps.check-inventory.data.items}"
```

</details>

### 🔌 Plugin System

Create custom step executors for your specific needs:

<details>
<summary><strong>Custom Step Example: Slack Notification</strong></summary>

```typescript
import { StepExecutor, ExecutionContext, StepResult } from 'workflow-engine';

export class SlackStepExecutor implements StepExecutor {
  type = 'slack';

  async execute(params: any, context: ExecutionContext): Promise<StepResult> {
    const { webhook_url, message, channel } = params;
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        channel: channel || '#general'
      })
    });

    return {
      success: response.ok,
      data: { message_sent: true, timestamp: new Date().toISOString() }
    };
  }
}

// Register the custom step
engine.registerStepExecutor(new SlackStepExecutor());
```

</details>

## 🌐 Web Dashboard Features

### 🎨 Modern React Interface

<div align="center">

**Built with cutting-edge technologies for the best developer experience**

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

### ⚡ Key Dashboard Features

- 🎛️ **Workflow Management** - Create, edit, delete, and organize workflows
- ⚡ **One-Click Execution** - Run workflows instantly from the UI
- 📊 **Real-time Monitoring** - Live execution status and progress tracking
- 🔍 **Detailed Logging** - Step-by-step execution details and error messages
- 🎨 **Syntax Highlighting** - Beautiful YAML editor with validation
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🌙 **Dark Mode** - Easy on the eyes for long development sessions
- 🔔 **Smart Notifications** - Instant feedback for all operations

## 🛠️ Development Setup

### 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Git** for version control

### 🏃‍♂️ Quick Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/workflow-engine.git
cd workflow-engine

# 2. Install all dependencies
npm run install:all

# 3. Start development servers
npm run dev:all  # Starts both backend and frontend

# Or start individually:
npm run dev:backend    # Backend only (port 3000)
npm run dev:frontend   # Frontend only (port 5173)
```

### 🎯 Available Scripts

<div align="center">

| Command | Description | Environment |
|:--------|:------------|:------------|
| `npm run dev:all` | 🚀 Start full development environment | Development |
| `npm run build:all` | 🏗️ Build backend + frontend for production | Production |
| `npm run test` | 🧪 Run backend test suite | Testing |
| `npm run lint:all` | 🔍 Lint both backend and frontend | Code Quality |

</div>

### 🔧 Project Structure

```
workflow-engine/
├── 📁 backend/                 # Node.js/TypeScript backend
│   ├── 📁 src/
│   │   ├── 📁 engine/         # Core workflow execution engine
│   │   ├── 📁 steps/          # Built-in step executors
│   │   ├── 📁 storage/        # Database and persistence layer
│   │   └── 📁 dashboard/      # REST API for web dashboard
│   └── 📄 package.json
│
├── 📁 frontend/               # React/TypeScript dashboard
│   ├── 📁 src/
│   │   ├── 📁 components/     # React components
│   │   ├── 📁 hooks/          # Custom React hooks
│   │   ├── 📁 services/       # API client services
│   │   └── 📁 contexts/       # React context providers
│   └── 📄 package.json
│
├── 📁 examples/               # Example workflows
│   ├── 📄 hello-world.yaml
│   └── 📄 api-pipeline.yaml
│
└── 📄 README.md              # This awesome documentation!
```


## 🤝 Contributing

We love contributions! Here's how you can help make the workflow engine even better:

### 🌟 Ways to Contribute

- 🐛 **Bug Reports** - Found a bug? Let us know!
- 💡 **Feature Requests** - Have an idea? We'd love to hear it!
- 📝 **Documentation** - Help improve our docs
- 🔧 **Code Contributions** - Submit pull requests
- 🎨 **UI/UX Improvements** - Make the dashboard even more beautiful

### 🚀 Quick Contribution Guide

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 📋 Development Guidelines

- ✅ Write tests for new features
- ✅ Follow TypeScript best practices
- ✅ Update documentation
- ✅ Use conventional commit messages


## ⭐ Show Your Support

If this project helped you, please consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features
- 📢 **Sharing** with your network

<div align="center">

**[⭐ Star this repository](https://github.com/your-username/workflow-engine)** • **[🐛 Report Bug](https://github.com/your-username/workflow-engine/issues)** • **[💡 Request Feature](https://github.com/your-username/workflow-engine/issues)**

</div>

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by developers, for developers**

*Happy automating! 🚀*

</div>
