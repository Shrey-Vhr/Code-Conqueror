import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications = await getUserNotifications(session.id);
  const unreadCount = await getUnreadCount(session.id);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body implies mark all
    }

    const targetId = body.notificationId || body.id;
    if (targetId) {
      await markNotificationAsRead(targetId, session.id);
    } else {
      await markAllNotificationsAsRead(session.id);
    }

    const unreadCount = await getUnreadCount(session.id);
    return NextResponse.json({ success: true, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body or empty body
    }

    const targetId = body.notificationId || body.id;
    if (targetId) {
      await markNotificationAsRead(targetId, session.id);
    } else {
      await markAllNotificationsAsRead(session.id);
    }

    const unreadCount = await getUnreadCount(session.id);
    return NextResponse.json({ success: true, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
