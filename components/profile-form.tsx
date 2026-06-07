"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/profile/actions";

type ProfileFormProps = {
  firstName: string;
  lastName: string;
};

type ProfileFormState = {
  errors?: {
    firstName?: string;
    lastName?: string;
    form?: string;
  };
  success?: boolean;
  profile?: {
    firstName: string;
    lastName: string;
  };
};

const initialState: ProfileFormState = {};

function getInputClass(hasError: boolean) {
  const errorClass =
    "border-[#c82014] focus:border-[#c82014] focus:ring-2 focus:ring-[hsl(4_82%_43%_/_18%)]";
  const defaultClass =
    "border-[rgba(0,0,0,0.16)] focus:border-[#00754A] focus:ring-2 focus:ring-[#d4e9e2]";

  return `w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition disabled:cursor-not-allowed disabled:bg-[#f9f9f9] ${
    hasError ? errorClass : defaultClass
  }`;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("ProfilePage");

  return (
    <button
      disabled={pending || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#00754A] bg-[#00754A] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      ) : null}
      <span>{t("saveButton")}</span>
    </button>
  );
}

export function ProfileForm({ firstName, lastName }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, initialState);
  const [values, setValues] = useState({
    firstName,
    lastName,
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
  });
  const t = useTranslations("ProfilePage");
  const savedValues = state.profile ?? { firstName, lastName };

  const clientErrors = {
    firstName: values.firstName.trim()
      ? null
      : t("validation.firstNameRequired"),
    lastName: values.lastName.trim()
      ? null
      : t("validation.lastNameRequired"),
  };
  const isValid = !clientErrors.firstName && !clientErrors.lastName;
  const isChanged =
    values.firstName.trim() !== savedValues.firstName ||
    values.lastName.trim() !== savedValues.lastName;
  const firstNameError =
    (touched.firstName && clientErrors.firstName) ||
    (state.errors?.firstName
      ? t(`validation.${state.errors.firstName}`)
      : null);
  const lastNameError =
    (touched.lastName && clientErrors.lastName) ||
    (state.errors?.lastName ? t(`validation.${state.errors.lastName}`) : null);

  return (
    <form action={formAction} className="space-y-5">
      {state.errors?.form ? (
        <p className="rounded-xl bg-[hsl(4_82%_43%_/_5%)] px-4 py-3 text-sm font-medium text-[#c82014]">
          {t(`errors.${state.errors.form}`)}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl bg-[#d4e9e2] px-4 py-3 text-sm font-medium text-[#006241]">
          {t("successMessage")}
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="profile-first-name"
          className="block text-sm font-semibold text-[#33433d]"
        >
          {t("firstNameLabel")}
        </label>
        <input
          id="profile-first-name"
          name="firstName"
          type="text"
          required
          value={values.firstName}
          autoComplete="given-name"
          placeholder={t("firstNamePlaceholder")}
          aria-invalid={Boolean(firstNameError)}
          aria-describedby={
            firstNameError ? "profile-first-name-error" : undefined
          }
          onBlur={() =>
            setTouched((currentTouched) => ({
              ...currentTouched,
              firstName: true,
            }))
          }
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              firstName: event.target.value,
            }))
          }
          className={getInputClass(Boolean(firstNameError))}
        />
        {firstNameError ? (
          <p
            id="profile-first-name-error"
            className="text-sm font-medium text-[#c82014]"
          >
            {firstNameError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="profile-last-name"
          className="block text-sm font-semibold text-[#33433d]"
        >
          {t("lastNameLabel")}
        </label>
        <input
          id="profile-last-name"
          name="lastName"
          type="text"
          required
          value={values.lastName}
          autoComplete="family-name"
          placeholder={t("lastNamePlaceholder")}
          aria-invalid={Boolean(lastNameError)}
          aria-describedby={lastNameError ? "profile-last-name-error" : undefined}
          onBlur={() =>
            setTouched((currentTouched) => ({
              ...currentTouched,
              lastName: true,
            }))
          }
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              lastName: event.target.value,
            }))
          }
          className={getInputClass(Boolean(lastNameError))}
        />
        {lastNameError ? (
          <p
            id="profile-last-name-error"
            className="text-sm font-medium text-[#c82014]"
          >
            {lastNameError}
          </p>
        ) : null}
      </div>

      <SubmitButton disabled={!isValid || !isChanged} />
    </form>
  );
}
