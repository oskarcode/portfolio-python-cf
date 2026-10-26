// Application ownership: Browser bootstrap that mounts React into the static HTML shell.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
