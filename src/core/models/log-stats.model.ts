export interface LogStats {
  daily: {
    labels: string[];
    data: number[];
  };
  users: {
    labels: string[];
    data: number[];
  };
  areas: {
    labels: string[];
    data: number[];
  };
  totals: {
    logins: number;
    uniqueUsers: number;
  };
}
