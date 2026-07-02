import { SchoolYearSettingsPanel } from "@/components/settings/SchoolYearSettingsPanel";
import { getSchoolYearSettingsData } from "@/lib/school-years/actions";

export async function SchoolYearSettingsSection() {
  const data = await getSchoolYearSettingsData();

  if (!data) {
    return null;
  }

  return <SchoolYearSettingsPanel initialData={data} />;
}
