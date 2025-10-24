import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/client/stores";
import { LoginForm } from "@/client/pages/auth/components/LoginForm";
import type { FormEvent } from "react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpClick = () => {
    navigate("/signup");
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <LoginForm
          username={username}
          password={password}
          isLoading={isLoading}
          error={error}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onSignUpClick={handleSignUpClick}
        />
      </div>
    </div>
  );
}

export default Login;
