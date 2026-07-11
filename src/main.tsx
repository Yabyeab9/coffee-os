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
  <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
    <AppWrapper>
      <App />
    </AppWrapper>
  </Sentry.ErrorBoundary>
);