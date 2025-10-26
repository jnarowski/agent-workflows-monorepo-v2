import { cn } from "@/client/lib/utils";
import { AuthFormCard } from "@/client/pages/auth/components/AuthFormCard";
import { LoadingButton } from "@/client/components/ui/loading-button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import type { FormEvent, ComponentProps } from "react";

interface LoginFormProps extends ComponentProps<"div"> {
  username: string;
  password: string;
  isLoading?: boolean;
  error?: string;
  onUsernameChange: (username: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSignUpClick?: () => void;
}

export function LoginForm({
  className,
  username,
  password,
  isLoading = false,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onSignUpClick,
  ...props
}: LoginFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <AuthFormCard
        title="Login to your account"
        description="Enter your username below to login to your account"
        error={error}
        onSubmit={onSubmit}
      >
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              tabIndex={-1}
              className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
          />
        </Field>
        <Field>
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Signing in..."
            className="w-full"
          >
            Login
          </LoadingButton>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSignUpClick?.();
              }}
              className="underline"
            >
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </AuthFormCard>
    </div>
  );
}
