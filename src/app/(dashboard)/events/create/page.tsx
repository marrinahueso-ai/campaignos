import { CreateEventForm } from "@/components/events/CreateEventForm";

export const metadata = {
  title: "Create campaign",
};

export default function CreateEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-cos-text">Create campaign</h1>
        <p className="mt-1 text-sm text-cos-muted">
          Add a new campaign and get its communications ready.
        </p>
      </div>

      <CreateEventForm />
    </div>
  );
}
