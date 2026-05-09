import type { UserNotification } from "./Notification";

export class NotificationService {
  private readonly KEY = "notifications";

  private get(): UserNotification[] {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private save(notifications: UserNotification[]): void {
    localStorage.setItem(this.KEY, JSON.stringify(notifications));
  }

  getAll(): UserNotification[] {
    return this.get();
  }

  getForUser(userId: string): UserNotification[] {
    return this.get().filter((n) => n.recipientId === userId);
  }

  getUnreadCount(userId: string): number {
    return this.getForUser(userId).filter((n) => !n.isRead).length;
  }

  send(data: Omit<UserNotification, "id" | "date" | "isRead">): UserNotification {
    const all = this.get();
    const notif: UserNotification = {
      ...data,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      isRead: false,
    };
    all.unshift(notif);
    this.save(all);
    return notif;
  }

  markAsRead(id: string): void {
    const all = this.get().map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.save(all);
  }

  markAllAsRead(userId: string): void {
    const all = this.get().map((n) =>
      n.recipientId === userId ? { ...n, isRead: true } : n
    );
    this.save(all);
  }
}
