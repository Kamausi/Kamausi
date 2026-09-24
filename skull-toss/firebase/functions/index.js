// Skull Toss's server: Cloud Functions for Firebase (2nd gen). The rules for Souls live in shared/economy.js and
// the handlers in handlers.js, the same files the game's build embeds; this file only connects them to Firestore
// and to the callers. Every function is callable (onCall): Firebase Auth identifies the player (request.auth.uid).
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const Economy = require("./shared/economy.js");
const Runs = require("./shared/runs.js");
const makeHandlers = require("./handlers.js");
const { verifyReceipt } = require("./receipts.js");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 20 });
const firestore = admin.firestore();

// the handlers' tiny database interface, on a real Firestore transaction
const db = {
  tx: fn => firestore.runTransaction(async tr => {
    const writes = [];
    const t = {
      get: async path => { const s = await tr.get(firestore.doc(path)); return s.exists ? s.data() : null; },
      set: (path, obj) => writes.push([path, obj])
    };
    const out = await fn(t);
    for (const [path, obj] of writes) tr.set(firestore.doc(path), obj);   // (Firestore wants every read before any write)
    return out;
  })
};
const handlers = makeHandlers(Economy, verifyReceipt, Runs);

// each callable: the caller's uid from Auth, the clock from the server, refusals as HttpsErrors
const wrap = name => onCall({ enforceAppCheck: false }, async request => {
  try { return await handlers[name]({ db, uid: request.auth && request.auth.uid, data: request.data || {}, now: Date.now() }); }
  catch (e) { throw new HttpsError(e.code || "internal", e.message || "failed"); }
});
for (const name of Object.keys(handlers)) exports[name] = wrap(name);
