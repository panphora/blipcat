import express from "express";
import cookieParser from "cookie-parser";
const app = express();

import { initRenderedRoutes } from "./lib/initRenderedRoutes";
import { initApiRoutes } from "./lib/initApiRoutes";

// configue app
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

initRenderedRoutes({app});
initApiRoutes({app});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)

  if (process.send) {
    process.send('online');
  }
})










