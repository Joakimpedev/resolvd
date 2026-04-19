const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to apps/mobile/.env and fill in.');
}
export const config = { API_URL } as const;
