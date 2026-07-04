export interface CreateEventFields {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  audience: string;
  theme: string;
  status: string;
  eventType: string;
  communicationStrategy: string;
}

export interface CreateEventFormState {
  error: string | null;
  fields?: CreateEventFields;
}

export function extractCreateEventFields(formData: FormData): CreateEventFields {
  return {
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
    time: formData.get("time")?.toString() ?? "",
    location: formData.get("location")?.toString() ?? "",
    audience: formData.get("audience")?.toString() ?? "",
    theme: formData.get("theme")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "draft",
    eventType: formData.get("eventType")?.toString() ?? "general_event",
    communicationStrategy:
      formData.get("communicationStrategy")?.toString() ?? "full_campaign",
  };
}

export function createEventErrorState(
  formData: FormData,
  error: string,
): CreateEventFormState {
  return {
    error,
    fields: extractCreateEventFields(formData),
  };
}
