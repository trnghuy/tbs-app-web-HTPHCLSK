// WebSocket notification hub — hiện dùng push notification (Expo) là chính.
// WebSocket real-time sẽ được kích hoạt khi triển khai Durable Objects.
// File này giữ interface ổn định để code hiện tại không bị lỗi import.

export const broadcast = (_userId: string, _type: string, _payload: unknown) => {
  // No-op: real-time qua WebSocket chưa được kích hoạt.
  // Dùng Expo push notification (xem lib/push.ts và lib/notifications-service.ts).
};
