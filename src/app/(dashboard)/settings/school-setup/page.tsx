import { isFoundingAccessCodeRequired } from "@/lib/auth/founding-access";
import { SchoolSetupWizard } from "@/components/school-setup/SchoolSetupWizard";

export const metadata = {
  title: "School Setup",
};

export default function SettingsSchoolSetupPage() {
  return (
    <div className="studio-page pb-12">
      <SchoolSetupWizard
        accessCodeRequired={isFoundingAccessCodeRequired()}
      />
    </div>
  );
}
