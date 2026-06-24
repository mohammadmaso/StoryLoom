import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProjectProvider } from "@/context/ProjectContext";
import { HomePage } from "@/pages/HomePage";
import { ExplorerPage } from "@/pages/ExplorerPage";
import { GraphPage } from "@/pages/GraphPage";
import { SearchPage } from "@/pages/SearchPage";
import { AiPage } from "@/pages/AiPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { GitPage } from "@/pages/GitPage";

export default function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="explorer" element={<ExplorerPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="ai" element={<AiPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="git" element={<GitPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}
