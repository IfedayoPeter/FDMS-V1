export type ApiEnvelope<T> = {
  content?: T;
  data?: T;
  hasError?: boolean;
  errorMessage?: string;
  message?: string;
  isSuccess?: boolean;
};

export const getApiErrorMessage = (error: any, fallback: string) =>
  error?.message || fallback;

export const ensureApiSuccess = (
  response: ApiEnvelope<any> | any | null | undefined,
  fallbackMessage?: string,
) => {
  if (!response) return;
  if (
    typeof response === "object" &&
    response !== null &&
    ("hasError" in response || "isSuccess" in response)
  ) {
    const envelope = response as ApiEnvelope<any>;
    if (envelope.hasError || envelope.isSuccess === false) {
      throw new Error(envelope.message || fallbackMessage || "Request failed");
    }
  }
};

export const getApiContent = <T>(
  response: ApiEnvelope<T> | T | null | undefined,
  fallback: T,
  label?: string,
): T => {
  if (!response) return fallback;
  if (
    typeof response === "object" &&
    response !== null &&
    ("hasError" in response || "isSuccess" in response)
  ) {
    const envelope = response as ApiEnvelope<T>;
    if (envelope.hasError || envelope.isSuccess === false) {
      throw new Error(
        envelope.message ||
          (label ? `Failed to load ${label}` : "Request failed"),
      );
    }
    if (envelope.content !== undefined) return envelope.content;
    if (envelope.data !== undefined) return envelope.data;
  }
  return response as T;
};
