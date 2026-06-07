"use client";

import type { ReactNode } from "react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { signIn, signUp } from "@/app/auth/actions";

type AuthPanelProps = {
  errorKey?: string | null;
  redirectTo?: "/";
};

type LoginField = "email" | "password";

type LoginValues = Record<LoginField, string>;

type LoginTouched = Record<LoginField, boolean>;

type SignupField = "firstName" | "lastName" | "email" | "password";

type SignupValues = Record<SignupField, string>;

type SignupTouched = Record<SignupField, boolean>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyLoginValues: LoginValues = {
  email: "",
  password: "",
};

const emptyLoginTouched: LoginTouched = {
  email: false,
  password: false,
};

const emptySignupValues: SignupValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const emptySignupTouched: SignupTouched = {
  firstName: false,
  lastName: false,
  email: false,
  password: false,
};

function getInputClass(hasError: boolean) {
  const errorClass =
    "border-[#c82014] focus:border-[#c82014] focus:ring-2 focus:ring-[hsl(4_82%_43%_/_18%)]";
  const defaultClass =
    "border-[rgba(0,0,0,0.16)] focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]";

  return `w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition disabled:cursor-not-allowed disabled:bg-[#f9f9f9] ${
    hasError ? errorClass : defaultClass
  }`;
}

function SubmitButton({
  children,
  formAction,
  disabled = false,
}: {
  children: ReactNode;
  formAction: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      formAction={formAction}
      disabled={isDisabled}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

function PendingFieldset({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <fieldset className="space-y-5 disabled:opacity-75" disabled={pending}>
      {children}
    </fieldset>
  );
}

export function AuthPanel({ errorKey, redirectTo = "/" }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginValues, setLoginValues] =
    useState<LoginValues>(emptyLoginValues);
  const [loginTouched, setLoginTouched] =
    useState<LoginTouched>(emptyLoginTouched);
  const [signupValues, setSignupValues] =
    useState<SignupValues>(emptySignupValues);
  const [signupTouched, setSignupTouched] =
    useState<SignupTouched>(emptySignupTouched);
  const t = useTranslations("AuthPage");
  const loginErrors = {
    email: EMAIL_PATTERN.test(loginValues.email.trim())
      ? null
      : t("validation.emailInvalid"),
    password:
      loginValues.password.length >= 8 ? null : t("validation.passwordShort"),
  };
  const signupErrors = {
    firstName: signupValues.firstName.trim()
      ? null
      : t("validation.firstNameRequired"),
    lastName: signupValues.lastName.trim()
      ? null
      : t("validation.lastNameRequired"),
    email: EMAIL_PATTERN.test(signupValues.email.trim())
      ? null
      : t("validation.emailInvalid"),
    password:
      signupValues.password.length >= 8 ? null : t("validation.passwordShort"),
  };
  const isLoginValid = Object.values(loginErrors).every((error) => !error);
  const isSignupValid = Object.values(signupErrors).every((error) => !error);

  function updateLoginField(field: LoginField, value: string) {
    setLoginValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function markLoginFieldTouched(field: LoginField) {
    setLoginTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function getLoginError(field: LoginField) {
    if (!loginTouched[field]) {
      return null;
    }

    return loginErrors[field];
  }

  function updateSignupField(field: SignupField, value: string) {
    setSignupValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function markSignupFieldTouched(field: SignupField) {
    setSignupTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function getSignupError(field: SignupField) {
    if (!signupTouched[field]) {
      return null;
    }

    return signupErrors[field];
  }

  function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSignupValid) {
      return;
    }

    event.preventDefault();
    setSignupTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
    });
  }

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    if (isLoginValid) {
      return;
    }

    event.preventDefault();
    setLoginTouched({
      email: true,
      password: true,
    });
  }

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.14)] bg-white p-5 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_1px_1px_0_rgba(0,0,0,0.12)]">
      <div className="grid grid-cols-2 rounded-full border border-[rgba(0,0,0,0.16)] bg-[#f9f9f9] p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          data-active={mode === "login"}
          className="rounded-full px-4 py-3 text-sm font-semibold text-[#33433d] transition active:scale-95 data-[active=true]:bg-[#00754A] data-[active=true]:text-white"
        >
          {t("loginButton")}
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          data-active={mode === "signup"}
          className="rounded-full px-4 py-3 text-sm font-semibold text-[#33433d] transition active:scale-95 data-[active=true]:bg-[#00754A] data-[active=true]:text-white"
        >
          {t("signupButton")}
        </button>
      </div>

      {errorKey ? (
        <p className="mt-5 rounded-xl bg-[hsl(4_82%_43%_/_5%)] px-4 py-3 text-sm font-medium text-[#c82014]">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      {mode === "login" ? (
        <form
          key="login-form"
          className="mt-7 space-y-5"
          noValidate
          onSubmit={handleLoginSubmit}
        >
          <PendingFieldset>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="space-y-2">
              <label
                htmlFor="home-login-email"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("emailLabel")}
              </label>
              <input
                id="home-login-email"
                name="email"
                type="email"
                required
                value={loginValues.email}
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                aria-invalid={Boolean(getLoginError("email"))}
                aria-describedby={
                  getLoginError("email") ? "home-login-email-error" : undefined
                }
                onBlur={() => markLoginFieldTouched("email")}
                onChange={(event) =>
                  updateLoginField("email", event.target.value)
                }
                className={getInputClass(Boolean(getLoginError("email")))}
              />
              {getLoginError("email") ? (
                <p
                  id="home-login-email-error"
                  className="text-sm font-medium text-[#c82014]"
                >
                  {getLoginError("email")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="home-login-password"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("passwordLabel")}
              </label>
              <input
                id="home-login-password"
                name="password"
                type="password"
                required
                minLength={8}
                value={loginValues.password}
                autoComplete="current-password"
                placeholder={t("loginPasswordPlaceholder")}
                aria-invalid={Boolean(getLoginError("password"))}
                aria-describedby={
                  getLoginError("password")
                    ? "home-login-password-error"
                    : undefined
                }
                onBlur={() => markLoginFieldTouched("password")}
                onChange={(event) =>
                  updateLoginField("password", event.target.value)
                }
                className={getInputClass(Boolean(getLoginError("password")))}
              />
              {getLoginError("password") ? (
                <p
                  id="home-login-password-error"
                  className="text-sm font-medium text-[#c82014]"
                >
                  {getLoginError("password")}
                </p>
              ) : null}
            </div>

            <SubmitButton formAction={signIn} disabled={!isLoginValid}>
              {t("loginButton")}
            </SubmitButton>
          </PendingFieldset>
        </form>
      ) : (
        <form
          key="signup-form"
          className="mt-7 space-y-5"
          noValidate
          onSubmit={handleSignupSubmit}
        >
          <PendingFieldset>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="home-first-name"
                  className="block text-sm font-semibold text-[#33433d]"
                >
                  {t("firstNameLabel")}
                </label>
                <input
                  id="home-first-name"
                  name="firstName"
                  type="text"
                  required
                  value={signupValues.firstName}
                  autoComplete="given-name"
                  placeholder={t("firstNamePlaceholder")}
                  aria-invalid={Boolean(getSignupError("firstName"))}
                  aria-describedby={
                    getSignupError("firstName")
                      ? "home-first-name-error"
                      : undefined
                  }
                  onBlur={() => markSignupFieldTouched("firstName")}
                  onChange={(event) =>
                    updateSignupField("firstName", event.target.value)
                  }
                  className={getInputClass(Boolean(getSignupError("firstName")))}
                />
                {getSignupError("firstName") ? (
                  <p
                    id="home-first-name-error"
                    className="text-sm font-medium text-[#c82014]"
                  >
                    {getSignupError("firstName")}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="home-last-name"
                  className="block text-sm font-semibold text-[#33433d]"
                >
                  {t("lastNameLabel")}
                </label>
                <input
                  id="home-last-name"
                  name="lastName"
                  type="text"
                  required
                  value={signupValues.lastName}
                  autoComplete="family-name"
                  placeholder={t("lastNamePlaceholder")}
                  aria-invalid={Boolean(getSignupError("lastName"))}
                  aria-describedby={
                    getSignupError("lastName")
                      ? "home-last-name-error"
                      : undefined
                  }
                  onBlur={() => markSignupFieldTouched("lastName")}
                  onChange={(event) =>
                    updateSignupField("lastName", event.target.value)
                  }
                  className={getInputClass(Boolean(getSignupError("lastName")))}
                />
                {getSignupError("lastName") ? (
                  <p
                    id="home-last-name-error"
                    className="text-sm font-medium text-[#c82014]"
                  >
                    {getSignupError("lastName")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="home-signup-email"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("emailLabel")}
              </label>
              <input
                id="home-signup-email"
                name="email"
                type="email"
                required
                value={signupValues.email}
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                aria-invalid={Boolean(getSignupError("email"))}
                aria-describedby={
                  getSignupError("email") ? "home-signup-email-error" : undefined
                }
                onBlur={() => markSignupFieldTouched("email")}
                onChange={(event) =>
                  updateSignupField("email", event.target.value)
                }
                className={getInputClass(Boolean(getSignupError("email")))}
              />
              {getSignupError("email") ? (
                <p
                  id="home-signup-email-error"
                  className="text-sm font-medium text-[#c82014]"
                >
                  {getSignupError("email")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="home-signup-password"
                className="block text-sm font-semibold text-[#33433d]"
              >
                {t("passwordLabel")}
              </label>
              <input
                id="home-signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                value={signupValues.password}
                autoComplete="new-password"
                placeholder={t("signupPasswordPlaceholder")}
                aria-invalid={Boolean(getSignupError("password"))}
                aria-describedby={
                  getSignupError("password")
                    ? "home-signup-password-error"
                    : "home-signup-password-hint"
                }
                onBlur={() => markSignupFieldTouched("password")}
                onChange={(event) =>
                  updateSignupField("password", event.target.value)
                }
                className={getInputClass(Boolean(getSignupError("password")))}
              />
              {getSignupError("password") ? (
                <p
                  id="home-signup-password-error"
                  className="text-sm font-medium text-[#c82014]"
                >
                  {getSignupError("password")}
                </p>
              ) : (
                <p
                  id="home-signup-password-hint"
                  className="text-sm leading-6 text-[#33433d]"
                >
                  {t("passwordHint")}
                </p>
              )}
            </div>

            <SubmitButton formAction={signUp} disabled={!isSignupValid}>
              {t("signupButton")}
            </SubmitButton>
          </PendingFieldset>
        </form>
      )}
    </div>
  );
}
