import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppWrapper } from "./components/common/PageMeta";
import "./index.css";

const env = import.meta.env ?? {};

const sentryDsn = env.VITE_SENTRY_DSN;
const mode = env.MODE ?? "development";

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: mode,
  });
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={({ resetError }) => (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <p>Something went wrong.</p>
      <button type="button" onClick={resetError} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
        Try again
      </button>
    </div>
  )}>
    <AppWrapper>
      <App />
    </AppWrapper>
  </Sentry.ErrorBoundary>
);