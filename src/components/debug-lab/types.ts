export type DebugLog = {
  id: string;
  created_at: string;
  event_type: "scrape" | "packet" | "auth" | "database" | "other";
  function_name: string;
  status: "success" | "running" | "error";
  message: string;
  payload: unknown;
  user_id: string | null;
  duration_ms: number | null;
};

export type FilterType = "all" | DebugLog["event_type"];
