"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  updatePhoneNumber,
  type UpdatePhoneNumberState,
} from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  countryCallingCodes,
  isPhoneCountryCode,
  isPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";

type RequiredPhoneNumberModalProps = {
  phoneCountryCode: string;
  phoneNumber: string;
};

const initialState: UpdatePhoneNumberState = {};

export function RequiredPhoneNumberModal({
  phoneCountryCode,
  phoneNumber,
}: RequiredPhoneNumberModalProps) {
  const router = useRouter();
  const t = useTranslations("ProfilePage");
  const [isOpen, setIsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [state, setState] = useState<UpdatePhoneNumberState>(initialState);
  const [touched, setTouched] = useState({
    phoneCountryCode: false,
    phoneNumber: false,
  });
  const [values, setValues] = useState({
    phoneCountryCode: isPhoneCountryCode(phoneCountryCode)
      ? phoneCountryCode
      : "+351",
    phoneNumber: phoneNumber === "0" ? "" : phoneNumber,
  });

  const clientErrors = {
    phoneCountryCode: isPhoneCountryCode(values.phoneCountryCode)
      ? null
      : t("validation.phoneCountryCodeRequired"),
    phoneNumber: isPhoneNumber(normalizePhoneNumber(values.phoneNumber))
      ? null
      : t("validation.phoneNumberInvalid"),
  };
  const isValid = !clientErrors.phoneCountryCode && !clientErrors.phoneNumber;
  const phoneCountryCodeError =
    (touched.phoneCountryCode && clientErrors.phoneCountryCode) ||
    (state.errors?.phoneCountryCode
      ? t(`validation.${state.errors.phoneCountryCode}`)
      : null);
  const phoneNumberError =
    (touched.phoneNumber && clientErrors.phoneNumber) ||
    (state.errors?.phoneNumber
      ? t(`validation.${state.errors.phoneNumber}`)
      : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ phoneCountryCode: true, phoneNumber: true });

    if (!isValid) {
      return;
    }

    setIsSaving(true);
    const nextState = await updatePhoneNumber(
      state,
      new FormData(event.currentTarget),
    );
    setState(nextState);

    if (nextState.success) {
      setIsOpen(false);
      router.refresh();
    }

    setIsSaving(false);
  }

  return (
    <Modal dismissible={false} onClose={() => false} open={isOpen} title={t("phoneRequiredTitle")}>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <p className="text-base leading-7 text-[#667085]">
          {t("phoneRequiredMessage")}
        </p>

        {state.errors?.form ? (
          <p
            className="rounded-xl border border-[#c73a3a]/25 bg-[#c73a3a]/8 px-4 py-3 text-sm leading-6 text-[#8f2626]"
            role="alert"
          >
            {t(`errors.${state.errors.form}`)}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SelectField
            autoComplete="tel-country-code"
            disabled={isSaving}
            error={phoneCountryCodeError}
            id="required-phone-country-code"
            label={t("phoneCountryCodeLabel")}
            name="phoneCountryCode"
            onBlur={() =>
              setTouched((currentTouched) => ({
                ...currentTouched,
                phoneCountryCode: true,
              }))
            }
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                phoneCountryCode: event.target.value,
              }))
            }
            required
            value={values.phoneCountryCode}
          >
            {countryCallingCodes.map(({ code, country, flag }) => (
              <option key={country} value={code}>
                {flag} {code}
              </option>
            ))}
          </SelectField>

          <Field
            autoComplete="tel-national"
            disabled={isSaving}
            error={phoneNumberError}
            id="required-phone-number"
            inputMode="tel"
            label={t("phoneNumberLabel")}
            name="phoneNumber"
            onBlur={() =>
              setTouched((currentTouched) => ({
                ...currentTouched,
                phoneNumber: true,
              }))
            }
            onChange={(event) =>
              setValues((currentValues) => ({
                ...currentValues,
                phoneNumber: event.target.value,
              }))
            }
            placeholder={t("phoneNumberPlaceholder")}
            required
            type="tel"
            value={values.phoneNumber}
          />
        </div>

        <Button disabled={!isValid || isSaving} fullWidth loading={isSaving}>
          {t("phoneRequiredSaveButton")}
        </Button>
      </form>
    </Modal>
  );
}
