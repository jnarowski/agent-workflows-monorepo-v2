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

interface SignupFormProps extends ComponentProps<"div"> {
  username: string;
  password: string;
  confirmPassword: string;
  isLoading?: boolean;
  error?: string;
  onUsernameChange: (username: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onSubmit: (e: FormEvent) => void;
  onLoginClick?: () => void;
}

export function SignupForm({
  className,
  username,
  password,
  confirmPassword,
  isLoading = false,
  error,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onLoginClick,
  ...props
}: SignupFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <AuthFormCard
        title="Create an account"
        description="Enter your information below to create your account"
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
            minLength={3}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">
            Confirm Password
          </FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
          />
        </Field>
        <Field>
          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Creating account..."
            className="w-full"
          >
            Sign Up
          </LoadingButton>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onLoginClick?.();
              }}
              className="underline"
            >
              Sign in
            </a>
          </FieldDescription>
        </Field>
      </AuthFormCard>
    </div>
  );
}
