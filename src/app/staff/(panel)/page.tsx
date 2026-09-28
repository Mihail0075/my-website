import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/auth";

export default async function StaffHome() {
  const { user } = await requireStaffPage();
  redirect(user.role === "ADMIN" ? "/staff/admin" : user.role === "COUNTER" ? "/staff/counter" : "/staff/driver");
}
