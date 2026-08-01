import { HelpCenter } from "@/components/help-center/HelpCenter";

export const metadata = {
  title: "Help",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HelpPage() {
  return <HelpCenter />;
}
