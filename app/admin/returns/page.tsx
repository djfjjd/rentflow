import { redirect } from "next/navigation";

export default function ReturnsPage() {
  redirect("/admin/dispatches");
}
