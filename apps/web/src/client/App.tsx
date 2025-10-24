import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/client/contexts/ShellContext";
import { WebSocketProvider } from "@/client/providers/WebSocketProvider";
import ProtectedLayout from "@/client/layouts/ProtectedLayout";
import AuthLayout from "@/client/layouts/AuthLayout";
import ProjectDetailLayout from "@/client/layouts/ProjectDetailLayout";
import Dashboard from "@/client/pages/Dashboard";
import Projects from "@/client/pages/Projects";
import ProjectHome from "@/client/pages/ProjectHome";
import ProjectSession from "@/client/pages/ProjectSession";
import ProjectShell from "@/client/pages/ProjectShell";
import ProjectFiles from "@/client/pages/ProjectFiles";
import AboutUs from "@/client/pages/AboutUs";
import Login from "@/client/pages/Login";
import Signup from "@/client/pages/Signup";
import LayoutExperiment from "@/client/pages/LayoutExperiment";

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <ShellProvider>
          <Routes>
            {/* Experiment routes - no layout */}
            <Route path="/experiment" element={<LayoutExperiment />} />

            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />

              {/* Project detail with nested routes */}
              <Route path="/projects/:id" element={<ProjectDetailLayout />}>
                <Route index element={<ProjectHome />} />
                <Route path="chat" element={<Navigate to="session/new" replace />} />
                <Route path="session/new" element={<ProjectSession />} />
                <Route path="session/:sessionId" element={<ProjectSession />} />
                <Route path="shell" element={<ProjectShell />} />
                <Route path="files" element={<ProjectFiles />} />
              </Route>

              <Route path="/about" element={<AboutUs />} />
            </Route>
          </Routes>
        </ShellProvider>
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;
