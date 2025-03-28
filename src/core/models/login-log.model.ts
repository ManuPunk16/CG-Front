export interface LoginLog {
  _id: string;
  eventType: string;
  userId: {
    _id: string;
    username: string;
  };
  username: string;
  userName: string;
  details: {
    ipAddress: string;
    userAgent: string;
  };
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
