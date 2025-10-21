import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ShellProvider } from "./contexts/ShellContext";
import ProtectedLayout from "./layouts/ProtectedLayout";
import AuthLayout from "./layouts/AuthLayout";
import ProjectDetailLayout from "./layouts/ProjectDetailLayout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectChat from "./pages/ProjectChat";
import ProjectShell from "./pages/ProjectShell";
import ProjectFiles from "./pages/ProjectFiles";
import AboutUs from "./pages/AboutUs";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LayoutExperiment from "./pages/LayoutExperiment";
import MockAIChat from "./pages/MockAIChat";
import MockChatTwo from "./pages/MockChatTwo";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ShellProvider>
          <Routes>
            {/* Experiment routes - no layout */}
            <Route path="/experiment" element={<LayoutExperiment />} />
            <Route path="/mock-chat" element={<MockAIChat />} />
            <Route path="/mock-chat-two" element={<MockChatTwo />} />

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
                <Route index element={<Navigate to="chat" replace />} />
                <Route path="chat" element={<ProjectChat />} />
                <Route path="shell" element={<ProjectShell />} />
                <Route path="files" element={<ProjectFiles />} />
              </Route>

              <Route path="/about" element={<AboutUs />} />
            </Route>
          </Routes>
        </ShellProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
