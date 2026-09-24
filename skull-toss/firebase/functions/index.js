// Skull Toss's server: Cloud Functions for Firebase (2nd gen). The rules for Souls live in shared/economy.js and
// the handlers in handlers.js, the same files the game's build embeds; this file only connects them to Firestore
// and to the callers. Every function is callable (onCall): Firebase Auth identifies the player (request.auth.uid).
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const Economy = require("./shared/economy.js");
const Runs = require("./shared/runs.js");
const Analytics = require("./shared/analytics.js");
const makeHandlers = require("./handlers.js");
const { verifyReceipt } = require("./receipts.js");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 20 });
const firestore = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

// the handlers' tiny database interface, on a real Firestore transaction
const db = {
  tx: fn => firestore.runTransaction(async tr => {
    const writes = [];
    const t = {
      get: async path => { const s = await tr.get(firestore.doc(path)); return s.exists ? s.data() : null; },
      set: (path, obj) => writes.push([path, obj.expireAt ? { ...obj, expireAt: Timestamp.fromMillis(obj.expireAt) } : obj]),   // (a TTL policy needs a timestamp)
      inc: (path, counts) => writes.push([path, Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, FieldValue.increment(n)])), { merge: true }])
    };
    const out = await fn(t);
    for (const [path, obj, opts] of writes) tr.set(firestore.doc(path), obj, opts || {});   // (Firestore wants every read before any write)
    return out;
  })
};
const handlers = makeHandlers(Economy, verifyReceipt, Runs, Analytics);

// each callable: the caller's uid from Auth, the clock from the server, refusals as HttpsErrors
const wrap = name => onCall({ enforceAppCheck: false }, async request => {
  try { return await handlers[name]({ db, uid: request.auth && request.auth.uid, data: request.data || {}, now: Date.now() }); }
  catch (e) { throw new HttpsError(e.code || "internal", e.message || "failed"); }
});
for (const name of Object.keys(handlers)) exports[name] = wrap(name);

// support's tools, for accounts you've given the admin claim (firebase/tools/admin.js can also run them directly):
// { op: "grant", uid, souls, reason } · { op: "revokeReceipt", receipt } · { op: "reverse", id }
exports.support = onCall(async request => {
  if (!request.auth || request.auth.token.admin !== true) throw new HttpsError("permission-denied", "support only");
  const op = String((request.data && request.data.op) || "");
  if (!Object.prototype.hasOwnProperty.call(handlers.admin, op)) throw new HttpsError("not-found", "no-such-op");
  try { return await handlers.admin[op]({ db, data: request.data, now: Date.now() }); }
  catch (e) { throw new HttpsError(e.code || "internal", e.message || "failed"); }
});

// refunds. The stores tell you when a purchase is refunded; the pack's Souls then come back off the wallet it
// credited (shared/economy.js: revoke). Receipts are filed under the store's order id (Google) or transaction id
// (Apple), the same id verifyReceipt returns.
// Google Play: Real-time developer notifications, on a Pub/Sub topic you name in the Play Console (default play-rtdn).
exports.playRefunds = onMessagePublished(process.env.PLAY_RTDN_TOPIC || "play-rtdn", async event => {
  const msg = event.data.message.json || {}, v = msg.voidedPurchaseNotification;
  if (!v || !v.orderId) return;
  try { await handlers.admin.revokeReceipt({ db, data: { receipt: v.orderId }, now: Date.now() }); }
  catch (e) { if (e.code !== "not-found") throw e; }   // (not a Soul pack: nothing to do)
});
// Apple: App Store Server Notifications (v2), posted to this URL. The signed payload is checked against Apple's root
// certificates (functions/certs/AppleRootCA-G3.cer, from apple.com/certificateauthority) before anything is done.
exports.appleNotices = onRequest(async (req, res) => {
  let lib, roots;
  try {
    lib = require("@apple/app-store-server-library");
    roots = [require("fs").readFileSync(require("path").join(__dirname, "certs", "AppleRootCA-G3.cer"))];
  } catch (e) { res.status(503).send("not configured"); return; }
  const env = process.env.APPLE_ENV === "sandbox" ? lib.Environment.SANDBOX : lib.Environment.PRODUCTION;
  const verifier = new lib.SignedDataVerifier(roots, true, env, process.env.APPLE_BUNDLE_ID, Number(process.env.APPLE_APP_ID) || undefined);
  try {
    const note = await verifier.verifyAndDecodeNotification(req.body && req.body.signedPayload);
    if (note.notificationType === "REFUND" && note.data && note.data.signedTransactionInfo) {
      const tx = await verifier.verifyAndDecodeTransaction(note.data.signedTransactionInfo);
      try { await handlers.admin.revokeReceipt({ db, data: { receipt: String(tx.transactionId) }, now: Date.now() }); }
      catch (e) { if (e.code !== "not-found") throw e; }
    }
    res.status(200).send("ok");
  } catch (e) { res.status(400).send("rejected"); }
});
