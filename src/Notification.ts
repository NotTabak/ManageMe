export type NotifPriority = "low" | "medium" | "high";

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  priority: NotifPriority;
  isRead: boolean;
  recipientId: string;
}
