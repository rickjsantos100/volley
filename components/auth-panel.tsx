"use client";

import type { ReactNode } from "react";
import type { FormEvent } from "react";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import type { AuthActionState } from "@/app/auth/actions";
import type { VerifyOtpErrorKey } from "@/app/auth/actions";
import type { VerifyOtpActionState } from "@/app/auth/actions";
import { signIn, signUp, verifyEmailOtp } from "@/app/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

type LoginField = "email";

type LoginValues = Record<LoginField, string>;

type LoginTouched = Record<LoginField, boolean>;

type SignupField = "firstName" | "lastName" | "email";

type SignupValues = Record<SignupField, string>;

type SignupTouched = Record<SignupField, boolean>;

type OtpPanelProps = {
  email: string;
  labels: {
    back: string;
    emailLabel: string;
    intro: string;
    otpErrors: Record<VerifyOtpErrorKey, string>;
    otpInvalid: string;
    otpLabel: string;
    otpPlaceholder: string;
    submit: string;
    title: string;
  };
  nextPath?: string;
  onBack: () => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

const emptyLoginValues: LoginValues = {
  email: "",
};

const emptyLoginTouched: LoginTouched = {
  email: false,
};

const emptySignupValues: SignupValues = {
  firstName: "",
  lastName: "",
  email: "",
};

const emptySignupTouched: SignupTouched = {
  firstName: false,
  lastName: false,
  email: false,
};

const initialAuthActionState: AuthActionState = {};
const initialVerifyOtpActionState: VerifyOtpActionState = {};

function PendingFieldset({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <fieldset className="space-y-5 disabled:opacity-75" disabled={pending}>
      {children}
    </fieldset>
  );
}

function OtpPanel({ email, labels, nextPath, onBack }: OtpPanelProps) {
  const [otpValue, setOtpValue] = useState("");
  const [otpTouched, setOtpTouched] = useState(false);
  const otpError =
    OTP_PATTERN.test(otpValue) || !otpTouched ? null : labels.otpInvalid;
  const isOtpValid = OTP_PATTERN.test(otpValue);
  const [verifyState, verifyAction] = useActionState(
    verifyEmailOtp,
    initialVerifyOtpActionState,
  );

  function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    if (isOtpValid) {
      return;
    }

    event.preventDefault();
    setOtpTouched(true);
  }

  return (
    <form
      action={verifyAction}
      className="mt-7 space-y-5"
      noValidate
      onSubmit={handleOtpSubmit}
    >
      <PendingFieldset>
        {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
        <input name="email" type="hidden" value={email} />

        <div className="space-y-2">
          <h2 className="font-matchday text-3xl leading-8 font-bold text-[#061b6b]">
            {labels.title}
          </h2>
          <p className="text-sm leading-6 text-[#667085]">
            {labels.intro}
          </p>
          <p className="rounded-xl border border-[#dde2ea] bg-white px-3.5 py-3 text-sm font-semibold text-[#101828]">
            <span className="text-[#667085]">{labels.emailLabel}: </span>
            {email}
          </p>
        </div>

        {verifyState.error ? (
          <Alert>{labels.otpErrors[verifyState.error]}</Alert>
        ) : null}

        <Field
          autoComplete="one-time-code"
          className="text-center font-matchday text-3xl font-bold tracking-[0.2em]"
          error={otpError}
          id="home-email-otp"
          inputMode="numeric"
          label={labels.otpLabel}
          maxLength={6}
          name="token"
          onBlur={() => setOtpTouched(true)}
          onChange={(event) => {
            setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6));
          }}
          pattern="[0-9]{6}"
          placeholder={labels.otpPlaceholder}
          required
          type="text"
          value={otpValue}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SubmitButton disabled={!isOtpValid} fullWidth>
            {labels.submit}
          </SubmitButton>
          <Button fullWidth onClick={onBack} type="button" variant="outline">
            {labels.back}
          </Button>
        </div>
      </PendingFieldset>
    </form>
  );
}

export function AuthPanel({ nextPath }: { nextPath?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpPanelKey, setOtpPanelKey] = useState(0);
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
  };
  const isLoginValid = Object.values(loginErrors).every((error) => !error);
  const isSignupValid = Object.values(signupErrors).every((error) => !error);

  async function handleLoginAction(
    previousState: AuthActionState,
    formData: FormData,
  ) {
    const nextState = await signIn(previousState, formData);

    if (nextState.error) {
      setLoginTouched({ email: true });
    } else if (nextState.email) {
      setOtpEmail(nextState.email);
      setOtpPanelKey((currentKey) => currentKey + 1);
    }

    return nextState;
  }

  async function handleSignupAction(
    previousState: AuthActionState,
    formData: FormData,
  ) {
    const nextState = await signUp(previousState, formData);

    if (nextState.error) {
      setMode("signup");
    } else if (nextState.email) {
      setOtpEmail(nextState.email);
      setOtpPanelKey((currentKey) => currentKey + 1);
    }

    return nextState;
  }

  const [loginState, loginAction] = useActionState(
    handleLoginAction,
    initialAuthActionState,
  );
  const [signupState, signupAction] = useActionState(
    handleSignupAction,
    initialAuthActionState,
  );
  const activeError = mode === "login" ? loginState.error : signupState.error;

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
    });
  }

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    if (isLoginValid) {
      return;
    }

    event.preventDefault();
    setLoginTouched({
      email: true,
    });
  }

  return (
    <Card className="p-5" variant="muted">
      {otpEmail ? (
        <OtpPanel
          key={otpPanelKey}
          email={otpEmail}
          labels={{
            back: t("otpBackButton"),
            emailLabel: t("emailLabel"),
            intro: t("otpIntro"),
            otpErrors: {
              "invalid-email": t("errors.invalid-email"),
              "invalid-otp": t("errors.invalid-otp"),
              "otp-verification-failed": t("errors.otp-verification-failed"),
            },
            otpInvalid: t("validation.otpInvalid"),
            otpLabel: t("otpLabel"),
            otpPlaceholder: t("otpPlaceholder"),
            submit: t("otpSubmitButton"),
            title: t("otpTitle"),
          }}
          nextPath={nextPath}
          onBack={() => setOtpEmail(null)}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 rounded-xl border border-[#dde2ea] bg-[#eef1f5] p-1">
            <Button
              type="button"
              onClick={() => setMode("login")}
              data-active={mode === "login"}
              variant="ghost"
              className="border-transparent px-4 py-3 text-[#475467] data-[active=true]:border-[#ffd21a] data-[active=true]:bg-[#ffd21a] data-[active=true]:text-[#061b6b]"
            >
              {t("loginButton")}
            </Button>
            <Button
              type="button"
              onClick={() => setMode("signup")}
              data-active={mode === "signup"}
              variant="ghost"
              className="border-transparent px-4 py-3 text-[#475467] data-[active=true]:border-[#ffd21a] data-[active=true]:bg-[#ffd21a] data-[active=true]:text-[#061b6b]"
            >
              {t("signupButton")}
            </Button>
          </div>

          {activeError ? (
            <Alert className="mt-5">{t(`errors.${activeError}`)}</Alert>
          ) : null}

          {mode === "login" ? (
            <form
              key="login-form"
              action={loginAction}
              className="mt-7 space-y-5"
              noValidate
              onSubmit={handleLoginSubmit}
            >
          <PendingFieldset>
            {nextPath ? (
              <input name="next" type="hidden" value={nextPath} />
            ) : null}
            <Field
              autoComplete="email"
              error={getLoginError("email")}
              id="home-login-email"
              label={t("emailLabel")}
              name="email"
              onBlur={() => markLoginFieldTouched("email")}
              onChange={(event) => updateLoginField("email", event.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              type="email"
              value={loginValues.email}
            />

            <SubmitButton disabled={!isLoginValid} fullWidth>
              {t("loginButton")}
            </SubmitButton>
          </PendingFieldset>
        </form>
      ) : (
        <form
          key="signup-form"
          action={signupAction}
          className="mt-7 space-y-5"
          noValidate
          onSubmit={handleSignupSubmit}
        >
          <PendingFieldset>
            {nextPath ? (
              <input name="next" type="hidden" value={nextPath} />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                autoComplete="given-name"
                error={getSignupError("firstName")}
                id="home-first-name"
                label={t("firstNameLabel")}
                name="firstName"
                onBlur={() => markSignupFieldTouched("firstName")}
                onChange={(event) =>
                  updateSignupField("firstName", event.target.value)
                }
                placeholder={t("firstNamePlaceholder")}
                required
                type="text"
                value={signupValues.firstName}
              />

              <Field
                autoComplete="family-name"
                error={getSignupError("lastName")}
                id="home-last-name"
                label={t("lastNameLabel")}
                name="lastName"
                onBlur={() => markSignupFieldTouched("lastName")}
                onChange={(event) =>
                  updateSignupField("lastName", event.target.value)
                }
                placeholder={t("lastNamePlaceholder")}
                required
                type="text"
                value={signupValues.lastName}
              />
            </div>

            <Field
              autoComplete="email"
              error={getSignupError("email")}
              id="home-signup-email"
              label={t("emailLabel")}
              name="email"
              onBlur={() => markSignupFieldTouched("email")}
              onChange={(event) =>
                updateSignupField("email", event.target.value)
              }
              placeholder={t("emailPlaceholder")}
              required
              type="email"
              value={signupValues.email}
            />

            <SubmitButton disabled={!isSignupValid}>
              {t("signupButton")}
            </SubmitButton>
          </PendingFieldset>
        </form>
      )}
        </>
      )}
    </Card>
  );
}
