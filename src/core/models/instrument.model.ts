export interface Instrument {
  _id: string;
  name: string;
  deleted: boolean;
  updatedAt: Date;
  createdAt: Date;
  status: string;
  message?: string;
}
