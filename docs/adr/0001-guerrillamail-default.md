# Prefer GuerrillaMail and retain DeveloperMail only for compatibility

DeveloperMail has become unavailable, so GuerrillaMail is now the default
provider while explicit `'DEVELOPER'` construction remains supported for
backward compatibility. The existing one-time fallback still moves a failed
DeveloperMail session to GuerrillaMail; selecting a replacement provider is a
separate, undecided decision rather than part of this compatibility release.
