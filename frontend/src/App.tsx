import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { WorkflowList } from "./components/WorkflowList";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "./contexts/NotificationContext";
import { createContext, useContext, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import "./App.css";

// Create WebSocket context to persist connection across route changes
const WebSocketContext = createContext<ReturnType<typeof useWebSocket> | null>(
  null
);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within WebSocketProvider"
    );
  }
  return context;
};

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const webSocket = useWebSocket();

  useEffect(() => {
    // Initialize WebSocket connection when app starts
    webSocket.connect();

    // Cleanup on unmount
    return () => {
      webSocket.disconnect();
    };
  }, [webSocket.connect, webSocket.disconnect]);

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

function AppContent() {
  const { isConnected } = useWebSocketContext();

  return (
    <Layout>
      <div className="app-websocket-status">
        {!isConnected && (
          <div className="connection-warning">
            <span className="connection-indicator disconnected" />
            WebSocket disconnected - Real-time updates unavailable
          </div>
        )}
      </div>
      <Routes>
        <Route path="/" element={<WorkflowList />} />
        <Route path="/create" element={<WorkflowEditor />} />
        <Route path="/edit/:id" element={<WorkflowEditor />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <WebSocketProvider>
          <Router>
            <AppContent />
          </Router>
        </WebSocketProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
