"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/profile/actions";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";

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
        <Alert>{t(`errors.${state.errors.form}`)}</Alert>
      ) : null}

      {state.success ? (
        <Alert variant="success">{t("successMessage")}</Alert>
      ) : null}

      <Field
        autoComplete="given-name"
        error={firstNameError}
        id="profile-first-name"
        label={t("firstNameLabel")}
        name="firstName"
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
        placeholder={t("firstNamePlaceholder")}
        required
        type="text"
        value={values.firstName}
      />

      <Field
        autoComplete="family-name"
        error={lastNameError}
        id="profile-last-name"
        label={t("lastNameLabel")}
        name="lastName"
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
        placeholder={t("lastNamePlaceholder")}
        required
        type="text"
        value={values.lastName}
      />

      <SubmitButton disabled={!isValid || !isChanged} fullWidth>
        {t("saveButton")}
      </SubmitButton>
    </form>
  );
}
