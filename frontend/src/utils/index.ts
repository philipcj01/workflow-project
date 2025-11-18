export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const getStatusColor = (
  status: "running" | "completed" | "failed"
): string => {
  switch (status) {
    case "running":
      return "status-running";
    case "completed":
      return "status-completed";
    case "failed":
      return "status-failed";
    default:
      return "";
  }
};

export const showNotification = (
  message: string,
  type: "success" | "error" = "success"
) => {
  // Simple notification - can be enhanced with a proper toast library later
  if (type === "success") {
    alert(`✅ ${message}`);
  } else {
    alert(`❌ ${message}`);
  }
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
