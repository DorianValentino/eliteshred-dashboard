export type Client = {
ClientID: number;
Name: string | null;
Email: string | null;
Paket: string | null;
IsActivated: boolean | null;
OnboardingDone?: boolean | null;

subscription_status?: "active" | "past_due" | "canceled" | null;

StartGewicht?: string | null;
Ziel?: string | null;
Status?: string | null;
};