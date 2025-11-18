import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { WorkflowList } from "./components/WorkflowList";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "./contexts/NotificationContext";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<WorkflowList />} />
              <Route path="/create" element={<WorkflowEditor />} />
              <Route path="/edit/:id" element={<WorkflowEditor />} />
            </Routes>
          </Layout>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
