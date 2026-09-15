# DNS and Fly Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the `alversjo.land` zone under dnscontrol in this repo (the org's infrastructure repo, DNS is its first content), create the two Fly apps the platform needs, point DNS at them, and get TLS certificates issued.

**Architecture:** One `dnsconfig.js` describes the whole zone. `creds.json` reads the Cloudflare token from an env var, so the file is safe to commit. GitHub Actions previews on pull requests and pushes on `main`. The Fly apps are created empty here (no deploy) because DNS records and certificates need their IPs before the platform exists.

**Tech Stack:** dnscontrol 4.44.1, Cloudflare DNS (account-owned API token), flyctl, GitHub Actions.

**Spec:** `Alversjo-org/platform` → `docs/superpowers/specs/2026-09-15-platform-v0-design.md`, sections 2 and 2.1.

## Global Constraints

- Domain is `alversjo.land`; Cloudflare account id `4058aa3c115b1570655f28e141ba4107`; zone id `793ff0ae9c3acc2c6eedb4018584cdf0`.
- Fly org slug `alversjo`, region `arn`. App names exactly `alversjo-platform` and `alversjo-boxes`.
- Records for Fly are DNS-only (never Cloudflare-proxied). No `CF_PROXY_ON` anywhere.
- Never hand-edit records in the Cloudflare UI. Every record goes through this repo.
- No secrets in the repo. `creds.json` contains only `$CLOUDFLARE_API_TOKEN` and the account id.
- Every change is committed and pushed immediately.
- dnscontrol is pinned to `4.44.1`; the linux amd64 tarball sha256 is `cd8f50de158ba1a8b3b4dd52e388f009f235f2f38a3e53c22b39a4bee038c684`.

---

### Task 1: Import the current zone

**Files:**
- Create: `dnsconfig.js`
- Create: `creds.json`
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Produces: `dnsconfig.js` with a single `D("alversjo.land", ...)` block that later tasks append records to.

- [ ] **Step 1: Write `creds.json`**

```json
{
  "cloudflare": {
    "TYPE": "CLOUDFLAREAPI",
    "apitoken": "$CLOUDFLARE_API_TOKEN",
    "accountid": "4058aa3c115b1570655f28e141ba4107"
  }
}
```

- [ ] **Step 2: Write `dnsconfig.js` from the exported zone**

This is the zone as exported on 2026-09-15 by `dnscontrol get-zones`, cleaned up. Keep every existing record; they serve mail and the old website. Before writing, re-export (`dnscontrol get-zones --creds creds.json --format=js cloudflare alversjo.land`) and fold in any record added since; Step 5 catches the rest.

```js
var DSP_CLOUDFLARE = NewDnsProvider("cloudflare", "CLOUDFLAREAPI");
var REG_NONE = NewRegistrar("none");

// Legacy Hostpoint web host (old website). Keep until the site moves.
var HOSTPOINT_V4 = "217.26.52.35";
var HOSTPOINT_V6 = "2a00:d70:0:b:2002:0:d91a:3423";

D("alversjo.land", REG_NONE,
  DnsProvider(DSP_CLOUDFLARE),
  DefaultTTL(1),

  // Old website + catch-all
  A("@", HOSTPOINT_V4),
  A("www", HOSTPOINT_V4),
  A("*", HOSTPOINT_V4),
  AAAA("@", HOSTPOINT_V6),
  AAAA("www", HOSTPOINT_V6),
  AAAA("*", HOSTPOINT_V6),

  // Hostpoint mail
  MX("@", 10, "mx1.mail.hostpoint.ch."),
  MX("@", 10, "mx2.mail.hostpoint.ch."),
  MX("www", 10, "mx1.mail.hostpoint.ch."),
  MX("www", 10, "mx2.mail.hostpoint.ch."),
  MX("*", 10, "mx1.mail.hostpoint.ch."),
  MX("*", 10, "mx2.mail.hostpoint.ch."),
  CNAME("autoconfig", "autoconfig.mail.hostpoint.ch."),
  CNAME("autodiscover", "autoconfig-nonssl.mail.hostpoint.ch."),
  TXT("@", "v=spf1 redirect=spf.mail.hostpoint.ch"),

  // Resend sending domain send.alversjo.land (a different Resend account; keep, do not touch)
  MX("send", 10, "feedback-smtp.eu-west-1.amazonses.com.", TTL(3600)),
  TXT("send", "v=spf1 include:amazonses.com ~all", TTL(3600)),
  TXT("resend._domainkey", "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC04WlSM2nTC2I8ZdLxx4ClFBJFG21oy5VFeSl6t9kUanyC+3slAL2Ycq4YoKOGld3z7yMeCwYarIut1rVpEAfS3MbfOBljMCQttoM+OAqmfEY0ERV7UIuygZy7sL3Tfn0r6CeGWTkRVjcOE5Vb/Tul4xH9oxYcc7opjik+ZptC4wIDAQAB", TTL(3600)),

  // Resend sending domain notifications.alversjo.land (the platform sends from here)
  MX("send.notifications", 10, "feedback-smtp.eu-west-1.amazonses.com.", TTL(3600)),
  TXT("send.notifications", "v=spf1 include:amazonses.com ~all", TTL(3600)),
  TXT("resend._domainkey.notifications", "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDd1etR6cCkj8x31erjAx+DwURLXbpoRAQlhP3WkTccFnDfwV3iemItVo3X3epVC00Mbjl6yAFJBYRam09WEjYZqXTfnaaBl+08s3En6LhwOGR+eghU5omWxni6/oQftvn17aYvmvUbdc91JtV7iv/s2FBtpohEr+3tWPBWLbBqywIDAQAB", TTL(3600)),
);
```

- [ ] **Step 3: Write `README.md`**

```markdown
# alversjo.land DNS

Managed with [dnscontrol](https://dnscontrol.org). Never edit records in the
Cloudflare UI; change `dnsconfig.js` and let CI push it.

    export CLOUDFLARE_API_TOKEN=...   # account-owned token, DNS edit on alversjo.land
    dnscontrol preview                 # diff against Cloudflare
    dnscontrol push                    # apply (CI does this on main)

Records that point at Fly must stay DNS-only (no Cloudflare proxy) because
Fly terminates TLS. Every change to this repo is committed and pushed immediately.
```

- [ ] **Step 4: Write `.gitignore`**

```
zones/
*.bak
```

- [ ] **Step 5: Verify the config matches Cloudflare exactly**

Run (with `CLOUDFLARE_API_TOKEN` exported in your shell, never written to a file in the repo):

```bash
dnscontrol preview
```

Expected: the summary line reports `0 corrections`. If it lists corrections, the config drifted from the export; fix `dnsconfig.js` until preview is clean. Do not push.

- [ ] **Step 6: Commit**

```bash
git add dnsconfig.js creds.json README.md .gitignore
git commit -m "Import alversjo.land zone into dnscontrol"
git push
```

---

### Task 2: Create the Fly apps and allocate IPs

**Files:** none in this repo. This task is flyctl only.

**Interfaces:**
- Produces: the public IPv4 and IPv6 of `alversjo-platform`, used by Task 3.

- [ ] **Step 1: Create both apps (no deploy)**

```bash
fly apps create alversjo-platform -o alversjo
fly apps create alversjo-boxes -o alversjo
```

Expected: `New app created: alversjo-platform` and the same for `alversjo-boxes`.

- [ ] **Step 2: Allocate a dedicated IPv4 and an IPv6 for the platform app**

```bash
fly ips allocate-v4 -a alversjo-platform --yes
fly ips allocate-v6 -a alversjo-platform
fly ips list -a alversjo-platform
```

Expected: one `v4` row with `TYPE dedicated` and one `v6` row. Note both addresses; Task 3 needs them. The dedicated IPv4 costs about 2 USD per month, which the spec accepts because wildcard certificates on shared IPv4 are undocumented.

- [ ] **Step 3: Confirm the boxes app has no public IP**

```bash
fly ips list -a alversjo-boxes
```

Expected: empty table. Boxes are reached only over the private network.

---

### Task 3: Point platform and boxes hostnames at Fly

**Files:**
- Modify: `dnsconfig.js`

**Interfaces:**
- Consumes: IPv4 and IPv6 from Task 2.
- Produces: `members.alversjo.land` and `*.boxes.alversjo.land` resolving to the platform app.

- [ ] **Step 1: Add the records**

Insert this block inside `D("alversjo.land", ...)` after the Resend records, replacing the two placeholder strings with the addresses from Task 2:

```js
  // Alversjö platform on Fly (app alversjo-platform). DNS-only: Fly terminates TLS.
  A("members", "<IPv4 from fly ips list>"),
  AAAA("members", "<IPv6 from fly ips list>"),
  A("*.boxes", "<IPv4 from fly ips list>"),
  AAAA("*.boxes", "<IPv6 from fly ips list>"),
```

- [ ] **Step 2: Preview**

```bash
dnscontrol preview
```

Expected: exactly 4 corrections, all `+ CREATE`, for `members.alversjo.land` (A, AAAA) and `*.boxes.alversjo.land` (A, AAAA). Nothing else changes.

- [ ] **Step 3: Push and verify resolution**

```bash
dnscontrol push
dig +short members.alversjo.land A
dig +short anything.boxes.alversjo.land A
```

Expected: both `dig` commands print the IPv4 from Task 2.

- [ ] **Step 4: Commit**

```bash
git add dnsconfig.js
git commit -m "Point platform and *.boxes at the Fly platform app"
git push
```

---

### Task 4: Issue TLS certificates

**Files:**
- Modify: `dnsconfig.js`

**Interfaces:**
- Produces: issued Fly certificates for `members.alversjo.land` and `*.boxes.alversjo.land`.

- [ ] **Step 1: Request both certificates**

```bash
fly certs add members.alversjo.land -a alversjo-platform
fly certs add "*.boxes.alversjo.land" -a alversjo-platform
```

Expected: each command prints the hostname and a DNS validation instruction of the form `_acme-challenge.<name> CNAME <token>.flydns.net.`. The wildcard cert costs about 2 USD per month.

- [ ] **Step 2: Read the exact validation targets**

```bash
fly certs show members.alversjo.land -a alversjo-platform
fly certs show "*.boxes.alversjo.land" -a alversjo-platform
```

Expected: a `DNS Validation Target` line for each. Copy both targets.

- [ ] **Step 3: Add the validation CNAMEs**

Append inside the `D(...)` block:

```js
  // ACME DNS-01 validation for Fly certificates
  CNAME("_acme-challenge.members", "<target from fly certs show>."),
  CNAME("_acme-challenge.boxes", "<target from fly certs show for *.boxes>."),
```

Targets must end with a trailing dot.

- [ ] **Step 4: Preview, push, wait for issuance**

```bash
dnscontrol preview        # expect 2 CREATE corrections
dnscontrol push
until fly certs check "*.boxes.alversjo.land" -a alversjo-platform 2>&1 | grep -q "Issued"; do sleep 15; done
fly certs list -a alversjo-platform
```

Expected: both rows show `STATUS Issued` within a few minutes.

- [ ] **Step 5: Commit**

```bash
git add dnsconfig.js
git commit -m "Add ACME validation records for Fly certificates"
git push
```

---

### Task 5: CI that previews on PRs and pushes on main

**Files:**
- Create: `.github/workflows/dns.yml`

- [ ] **Step 1: Store the token as a repository secret**

```bash
gh secret set CLOUDFLARE_API_TOKEN -R Alversjo-org/infrastructure
```

Paste the token when prompted. Expected: `✓ Set Actions secret CLOUDFLARE_API_TOKEN for Alversjo-org/infrastructure`.

- [ ] **Step 2: Write the workflow**

```yaml
name: dns
on:
  pull_request:
  push:
    branches: [main]

jobs:
  dnscontrol:
    runs-on: ubuntu-latest
    env:
      DNSCONTROL_VERSION: 4.44.1
      DNSCONTROL_SHA256: cd8f50de158ba1a8b3b4dd52e388f009f235f2f38a3e53c22b39a4bee038c684
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - name: Install dnscontrol
        run: |
          curl -fsSL -o dnscontrol.tar.gz "https://github.com/StackExchange/dnscontrol/releases/download/v${DNSCONTROL_VERSION}/dnscontrol_${DNSCONTROL_VERSION}_linux_amd64.tar.gz"
          echo "${DNSCONTROL_SHA256}  dnscontrol.tar.gz" | sha256sum -c -
          tar -xzf dnscontrol.tar.gz dnscontrol
          sudo mv dnscontrol /usr/local/bin/
          dnscontrol version
      - name: Preview
        run: dnscontrol preview
      - name: Push
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: dnscontrol push
```

- [ ] **Step 3: Commit and watch the run**

```bash
git add .github/workflows/dns.yml
git commit -m "CI: dnscontrol preview on PRs, push on main"
git push
gh run watch -R Alversjo-org/infrastructure --exit-status
```

Expected: the run succeeds and the `Push` step logs `0 corrections`, because the zone already matches.
