import { redirect } from "next/navigation";

/** The employee list is the home page. */
export default function Home() {
  redirect("/employees");
}
