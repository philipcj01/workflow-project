import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { WorkflowList } from "./components/WorkflowList";
import { WorkflowEditor } from "./components/WorkflowEditor";
import "./App.css";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<WorkflowList />} />
          <Route path="/create" element={<WorkflowEditor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
