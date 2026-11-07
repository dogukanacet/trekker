// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a8b31781d693d1a5622896283f1f82d1@o4511971188342784.ingest.de.sentry.io/4511971188670544",

  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
