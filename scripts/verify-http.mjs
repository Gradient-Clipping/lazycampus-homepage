import assert from "node:assert/strict";

const base = new URL(process.env.VERIFY_URL || "http://127.0.0.1:8080");
const get = (path, options) => fetch(new URL(path, base), {
  signal: AbortSignal.timeout(15_000),
  ...options,
});

const health = await get("/healthz");
assert.equal(health.status, 200);
assert.equal(await health.text(), "ok\n");
assert.match(health.headers.get("cache-control"), /no-store/);

const entry = await get("/");
assert.equal(entry.status, 200);
assert.match(entry.headers.get("content-type"), /text\/html/);
assert.match(entry.headers.get("cache-control"), /public, max-age=0, s-maxage=300/);
const html = await entry.text();
assert.match(html, /LaZy Campus/);
assert.match(html, /云原生/);

const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"?#]+\.(?:js|css))"/g)]
  .map((match) => match[1]);
assert.ok(assets.some((asset) => asset.endsWith(".js")));
assert.ok(assets.some((asset) => asset.endsWith(".css")));
for (const path of assets) {
  const response = await get(path, { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("cache-control"), /max-age=31536000, immutable/);
  assert.equal(response.headers.get("content-encoding"), "gzip", path);
  assert.match(response.headers.get("content-type"), path.endsWith(".js") ? /javascript/ : /text\/css/);
  assert.ok((await response.text()).length > 1000);
}

for (const path of ["/assets/missing-release.js", "/media/missing-image.png", "/media/missing-image.webp", "/icons/missing-icon.svg"]) {
  const response = await get(path);
  assert.equal(response.status, 404, path);
  assert.doesNotMatch(response.headers.get("cache-control") || "", /immutable/);
}

console.log("PASS container health, entry point, asset MIME types, gzip, cache policy and missing-file responses");
