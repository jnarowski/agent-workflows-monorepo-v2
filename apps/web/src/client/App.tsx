import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/client/pages/projects/shell/contexts/ShellContext";
import { WebSocketProvider } from "@/client/providers/WebSocketProvider";
import ProtectedLayout from "@/client/layouts/ProtectedLayout";
import AuthLayout from "@/client/layouts/AuthLayout";
import ProjectDetailLayout from "@/client/layouts/ProjectDetailLayout";
import Projects from "@/client/pages/Projects";
import ProjectHome from "@/client/pages/ProjectHome";
import ProjectSession from "@/client/pages/projects/sessions/ProjectSession";
import ProjectShell from "@/client/pages/projects/shell/ProjectShell";
import ProjectFiles from "@/client/pages/projects/files/ProjectFiles";
import ProjectSourceControl from "@/client/pages/projects/git/ProjectSourceControl";
import Login from "@/client/pages/auth/Login";
import Signup from "@/client/pages/auth/Signup";

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <ShellProvider>
          <Routes>
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedLayout />}>
              {/* Root redirect to projects */}
              <Route index element={<Navigate to="/projects" replace />} />

              {/* Projects list */}
              <Route path="/projects" element={<Projects />} />

              {/* Project detail with nested routes */}
              <Route path="/projects/:id" element={<ProjectDetailLayout />}>
                <Route index element={<ProjectHome />} />
                <Route
                  path="chat"
                  element={<Navigate to="session/new" replace />}
                />
                <Route path="session/new" element={<ProjectSession />} />
                <Route path="session/:sessionId" element={<ProjectSession />} />
                <Route path="shell" element={<ProjectShell />} />
                <Route path="files" element={<ProjectFiles />} />
                <Route path="source-control" element={<ProjectSourceControl />} />
              </Route>
            </Route>
          </Routes>
        </ShellProvider>
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;
