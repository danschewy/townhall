// Flowglad server configuration
import { FlowgladServer } from '@flowglad/nextjs/server';

// Simple in-memory user store for hackathon demo
// In production, you'd use a real database
const users = new Map<
  string,
  { email: string; name: string; isPremium: boolean }
>();

export function setUserDetails(
  id: string,
  details: { email: string; name: string; isPremium?: boolean }
) {
  users.set(id, { ...details, isPremium: details.isPremium ?? false });
}

export function getUserDetails(id: string) {
  return users.get(id);
}

export function setUserPremium(id: string, isPremium: boolean) {
  const user = users.get(id);
  if (user) {
    user.isPremium = isPremium;
  }
}

// Flowglad server instance factory
export const flowglad = (customerExternalId: string) => {
  return new FlowgladServer({
    customerExternalId,
    getCustomerDetails: async (externalId) => {
      // Try to get user from our store
      const user = users.get(externalId);
      if (user) {
        return { email: user.email, name: user.name };
      }
      // Fallback for demo - use a placeholder email
      return {
        email: `${externalId}@townhall.demo`,
        name: externalId,
      };
    },
  });
};
