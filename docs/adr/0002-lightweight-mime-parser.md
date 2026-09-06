# Reuse typescript-email-parser for DeveloperMail MIME

DeveloperMail's raw responses only need to be converted to the legacy mailbox
read model, but `mailparser` pulled Node stream dependencies into consumer
bundles and caused Webpack `node:` URI failures. The library now uses
`typescript-email-parser`: it is dependency-free, typed, CJS-compatible, and
bundles cleanly with Webpack 4. Writing and maintaining a private parser was
not worth duplicating RFC2045/RFC5322 behavior.
