import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NotificationsClient, SerializedNotification } from "./NotificationsClient";

export const metadata = {
  title: "Notification Center | CampusShare",
  description: "View alerts, reminders, and updates for your bookings and waitlists.",
};

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/notifications");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serializedNotifications: SerializedNotification[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="py-6 sm:py-8">
      <NotificationsClient
        initialNotifications={serializedNotifications}
        user={{
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
        }}
      />
    </div>
  );
}