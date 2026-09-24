// Store receipt checks for Soul packs. Each store has its own server API and credentials, which this repo
// can't hold, so the real checks are left for you to fill in (see firebase/README.md, "Soul packs").
// verifyReceipt resolves { valid, product, id } where id is the store's unique transaction id (used so a receipt
// can only ever be credited once). Until a store is wired up it refuses everything, except in the emulator,
// where a receipt of the form "TEST:<anything>" is accepted so the purchase flow can be tried end to end.
async function verifyReceipt({ platform, receipt, product }) {
  if (process.env.FUNCTIONS_EMULATOR === "true" && /^TEST:/.test(receipt)) return { valid: true, product, id: `test-${receipt.slice(5)}` };
  if (platform === "google") {
    // Google Play Developer API: purchases.products.get(packageName, productId, token) with a service account.
    return { valid: false };
  }
  if (platform === "apple") {
    // App Store Server API: GET /inApps/v1/transactions/{transactionId}, signed JWT with your App Store Connect key.
    return { valid: false };
  }
  if (platform === "steam") {
    // Steam microtransactions: ISteamMicroTxn/QueryTxn with your publisher key.
    return { valid: false };
  }
  return { valid: false };
}
module.exports = { verifyReceipt };
