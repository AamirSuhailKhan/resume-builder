import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CareerTwinClient } from "@/components/twin/CareerTwinClient";
import { CareerTwinService } from "@/lib/twin/career-twin.service";

export const dynamic = "force-dynamic";

export default async function TwinPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const twin = await CareerTwinService.getSnapshot(userId);
  const serialized = JSON.parse(JSON.stringify(twin));

  return <CareerTwinClient initialTwin={serialized} />;
}
