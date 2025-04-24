export interface LoginLog {
  _id: string;
  eventType: string;
  userId: string | {
    _id: string;
    username: string;
    area?: string;
    roles?: string;
  };
  username: string;
  userName?: string;
  details: {
    ipAddress: string;
    userAgent: string;
    method?: string;
    path?: string;
    timestamp?: string;
  };
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
