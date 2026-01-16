import { nextRouteHandler } from '@flowglad/nextjs/server';
import { flowglad } from '@/lib/flowglad';
import { cookies } from 'next/headers';

// Get user ID from the request (using a simple cookie-based approach for hackathon)
async function getUserIdFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('townhall_user_id')?.value || null;
}

export const { GET, POST } = nextRouteHandler({
  flowglad,
  getCustomerExternalId: async () => {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return userId;
  },
});
