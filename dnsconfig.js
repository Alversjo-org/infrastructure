var DSP_CLOUDFLARE = NewDnsProvider("cloudflare", "CLOUDFLAREAPI");
var REG_NONE = NewRegistrar("none");

// Legacy Hostpoint web host (old website). Keep until the site moves.
var HOSTPOINT_V4 = "217.26.52.35";
var HOSTPOINT_V6 = "2a00:d70:0:b:2002:0:d91a:3423";

D("alversjo.land", REG_NONE,
  DnsProvider(DSP_CLOUDFLARE),
  DefaultTTL(1), // 1 is Cloudflare's "automatic" TTL sentinel, not one second

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

  // Alversjö platform on Fly (app alversjo-platform). DNS-only: Fly terminates TLS.
  A("members", "137.66.44.32"),
  AAAA("members", "2a09:8280:1::18f:813:0"),
  // Note: the bare name boxes.alversjo.land still falls through to the "*"
  // wildcard above (Cloudflare wildcard semantics: "*.boxes" only matches
  // names under boxes, not boxes itself) and is not covered by the
  // *.boxes certificate. Accepted for v0.
  A("*.boxes", "137.66.44.32"),
  AAAA("*.boxes", "2a09:8280:1::18f:813:0"),

  // ACME DNS-01 validation for Fly certificates. These records are permanent:
  // Fly re-validates on every renewal, so they must never be removed while
  // the certs exist.
  CNAME("_acme-challenge.members", "members.alversjo.land.o905m19.flydns.net."),
  CNAME("_acme-challenge.boxes", "boxes.alversjo.land.o905m19.flydns.net."),
);
