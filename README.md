# alversjo.land DNS

Managed with [dnscontrol](https://dnscontrol.org). Never edit records in the
Cloudflare UI; change `dnsconfig.js` and let CI push it.

    set -a; source ~/.config/alversjo/secrets.env; set +a   # mode-600 file outside the repo holding CLOUDFLARE_API_TOKEN
    dnscontrol preview                 # diff against Cloudflare
    dnscontrol push                    # CI only; run by hand only to recover a broken CI run

CI pins dnscontrol 4.44.1 (see `.github/workflows/dns.yml`); use the same
version for local runs.

Records that point at Fly must stay DNS-only (no Cloudflare proxy) because
Fly terminates TLS. Every change to this repo is committed and pushed immediately.

The `_acme-challenge.*` CNAME records used for Fly's ACME DNS-01 validation
are permanent: Fly re-validates on every certificate renewal, so these
records must never be removed while the certs exist.
