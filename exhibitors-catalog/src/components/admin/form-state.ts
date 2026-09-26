/** Резултат от Server Action, върнат към формата. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const initialFormState: FormState = {};
