// The site's IndexNow key, derived from its host instead of stored in the repo. IndexNow keys aren't secret (the build
// publishes this one at /<key>.txt, which is what proves a ping comes from us), but a stored random key looks like a
// leaked credential to the secret scanner. Same host, same key; a new domain gets a new key and a new key file.
import crypto from "node:crypto";

export const indexNowKey = (siteUrl) => crypto.createHash("sha256").update(`indexnow:${new URL(siteUrl).host}`).digest("hex").slice(0, 32);
