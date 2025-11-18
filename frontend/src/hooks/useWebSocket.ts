import { useEffect, useRef, useState, useCallback } from "react";

export interface WorkflowEvent {
  type:
    | "workflow_started"
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "workflow_completed"
    | "workflow_failed";
  runId: string;
  workflowName: string;
  timestamp: string;
  data?: any;
}

export interface WebSocketMessage {
  type: "workflow_event" | "connection_established" | "run_update";
  event?: WorkflowEvent;
  run?: any;
  timestamp?: string;
}

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const eventCallbacks = useRef<Map<string, (event: WorkflowEvent) => void>>(
    new Map()
  );

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    // Connect to backend WebSocket server on port 3000
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const backendHost = window.location.hostname; // Get just the hostname (localhost)
    const wsUrl = `${protocol}//${backendHost}:3000`; // Connect to backend port 3000

    console.log("Attempting to connect to WebSocket:", wsUrl);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected to:", wsUrl);
      setIsConnected(true);
    };

    ws.current.onclose = (event) => {
      console.log(
        "WebSocket disconnected. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      setIsConnected(false);
      // Attempt to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === "workflow_event" && message.event) {
          setEvents((prev) => [...prev, message.event!]);

          // Call registered callbacks for this event type
          eventCallbacks.current.forEach((callback) => {
            callback(message.event!);
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const onEvent = useCallback((callback: (event: WorkflowEvent) => void) => {
    const id = Math.random().toString(36).substring(7);
    eventCallbacks.current.set(id, callback);

    return () => {
      eventCallbacks.current.delete(id);
    };
  }, []);

  const getEventsForRun = useCallback(
    (runId: string) => {
      return events.filter((event) => event.runId === runId);
    },
    [events]
  );

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    events,
    clearEvents,
    onEvent,
    getEventsForRun,
    connect,
    disconnect,
  };
};
