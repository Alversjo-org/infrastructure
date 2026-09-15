# alversjo.land DNS

Managed with [dnscontrol](https://dnscontrol.org). Never edit records in the
Cloudflare UI; change `dnsconfig.js` and let CI push it.

    export CLOUDFLARE_API_TOKEN=...   # account-owned token, DNS edit on alversjo.land
    dnscontrol preview                 # diff against Cloudflare
    dnscontrol push                    # apply (CI does this on main)

Records that point at Fly must stay DNS-only (no Cloudflare proxy) because
Fly terminates TLS. Every change to this repo is committed and pushed immediately.
