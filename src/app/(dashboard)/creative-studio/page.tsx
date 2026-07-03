import { redirect } from "next/navigation";

export const metadata = {
  title: "Artwork",
};

export default function CreativeStudioPage() {
  redirect("/events");
}
