# Use a lightweight MIME parser instead of mailparser

The published library only needs a small, synchronous subset of MIME handling
for the deprecated DeveloperMail read model. Keeping `mailparser` pulled its
stream-based Node dependency graph into consumer builds and caused Webpack
`node:` URI resolution failures, so the library now uses a local parser for
plain, encoded, and multipart messages. If full MIME support is needed later,
that should be introduced behind an explicit provider boundary.
