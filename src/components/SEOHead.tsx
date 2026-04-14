import { Helmet } from "react-helmet-async";

export function SEOHead() {
  return (
    <Helmet>
      <title>TaskFlow — Kanban Board for Productivity</title>
      <meta name="description" content="TaskFlow is a gorgeous, interactive Kanban board with drag & drop, AI assistant, and real-time task management. Organize your work effortlessly." />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Helmet>
  );
}
