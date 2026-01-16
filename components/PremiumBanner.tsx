'use client';

import { useBilling } from '@flowglad/nextjs';

export function PremiumBanner() {
  const billing = useBilling();

  // If not loaded yet, don't show banner
  if (!billing.loaded) return null;

  // Check if user has an active subscription
  const currentSub = billing.currentSubscription;
  const isSubscribed = currentSub?.status === 'active';

  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-300 text-sm">Premium Active</span>
          <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
            PRO
          </span>
        </div>
      </div>
    );
  }

  // Handle upgrade click
  const handleUpgrade = async () => {
    if (!billing.createCheckoutSession) return;

    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';
      await billing.createCheckoutSession({
        priceSlug: 'pro-monthly', // You'll need to create this in Flowglad dashboard
        successUrl: currentUrl,
        cancelUrl: currentUrl,
        autoRedirect: true,
      });
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-amber-300 font-medium text-sm">
            Upgrade to Premium
          </h3>
          <p className="text-amber-300/70 text-xs mt-1">
            Unlimited messages, priority processing
          </p>
        </div>
        <button
          onClick={handleUpgrade}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-lg transition-colors"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
