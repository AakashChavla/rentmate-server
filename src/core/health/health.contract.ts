export interface LiveHealth {
  status: string;
  message: string;
  timestamp: string;
  locale: string;
}
export abstract class HealthService {
  public abstract live(locale: string): LiveHealth;
}
