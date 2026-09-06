# E2E Mailbox

[![Contributors](https://img.shields.io/github/contributors/allynsweet/E2E-Mailbox.svg)](https://github.com/allynsweet/E2E-Mailbox/graphs/contributors)

NPM: [![npm](https://img.shields.io/npm/v/e2e-mailbox.svg)](https://www.npmjs.com/package/e2e-mailbox) [![npm downloads (monthly)](https://img.shields.io/npm/dm/e2e-mailbox.svg?label=downloads%20%28monthly%29)](https://www.npmjs.com/package/e2e-mailbox) [![npm downloads (all time)](https://img.shields.io/npm/dt/e2e-mailbox.svg?label=downloads%20%28all%20time%29)](https://www.npmjs.com/package/e2e-mailbox) [![Node version](https://img.shields.io/node/v/e2e-mailbox.svg)](https://www.npmjs.com/package/e2e-mailbox)

CI: [![example workflow](https://github.com/allynsweet/E2E-Mailbox/actions/workflows/node.js.yml/badge.svg)](https://github.com/allynsweet/E2E-Mailbox/actions/workflows/node.js.yml) [![License](https://img.shields.io/npm/l/e2e-mailbox.svg)](https://opensource.org/licenses/MIT)

E2E Mailbox is a fully-typed TypeScript library for checking email that your
system sends during integration and end-to-end tests.

Use it to verify a welcome email, extract a confirmation URL, read a reset
password code, or assert that the correct notification was produced after an
application action.

## Provider status

- **GuerrillaMail** is the default provider as of 2.0.
- **DeveloperMail** is deprecated and retained only for compatibility. Its
  public service has become unreliable, so explicit `'DEVELOPER'` sessions may
  fall back to GuerrillaMail when mailbox creation fails.
- GuerrillaMail does not implement `sendSelfMail`. Instead, configure the system
  under test (or test setup) to send through SMTP to the generated address.

## Installation

```console
$ npm install e2e-mailbox
```

or:

```console
$ yarn add e2e-mailbox
```

The package ships dual CommonJS and ESM entry points with TypeScript
declarations. Node 18 or newer is recommended.

## Quick start

```js
import E2EMailbox from 'e2e-mailbox';

const mailbox = new E2EMailbox();
const emailAddress = await mailbox.createEmailAddress();

// Register the user or trigger your application's email flow here.
const email = await mailbox.waitForEmail('Confirm your email', 60);

if (email) {
  const [confirmUrl] = mailbox
    .extractLinksFromEmail(email)
    .filter((url) => url.includes('https://example.com/confirm'));
}
```

Pass `'GUERRILLA'` explicitly when you want to make the provider obvious:

```js
import E2EMailbox from 'e2e-mailbox';

const mailbox = new E2EMailbox('GUERRILLA');
```

## API

| Method | Description |
| --- | --- |
| `createEmailAddress()` | Create a mailbox, falling back to the other provider if the requested provider is unavailable. |
| `waitForEmail(subjectLine, maxLimitInSeconds = 60)` | Poll until an email whose subject contains `subjectLine` arrives, then fetch its full body. |
| `fetchEmailList()` | Return the messages currently visible in the mailbox. |
| `fetchEmailById(emailId)` | Return one parsed email. |
| `deleteEmailById(emailId)` | Delete one email. |
| `forgetEmailAddress(emailAddress)` | Delete the mailbox and its messages. |
| `sendSelfMail(subject, body)` | Send directly through DeveloperMail. Deprecated, and unavailable with GuerrillaMail. |
| `extractLinksFromEmail(email)` | Extract `href` URLs from the email body. |

## Example test

```js
const mailbox = new E2EMailbox();
let emailAddress;

test('creates a mailbox', async () => {
  emailAddress = await mailbox.createEmailAddress();
  expect(emailAddress).toContain('@');
});

test('receives the welcome email', async () => {
  // Complete registration before waiting for the notification.
  const email = await mailbox.waitForEmail('Welcome', 100);

  expect(email).toBeDefined();
  expect(email.mail_subject).toContain('Welcome');
});

test('extracts the confirmation link', async () => {
  const urls = mailbox.extractLinksFromEmail(email);
  const confirmUrl = urls.find((url) => url.startsWith('https://example.com/confirm'));

  expect(confirmUrl).toBeDefined();
});
```

## Temporary providers

GuerrillaMail and DeveloperMail are free public services intended for
short-lived mailboxes. They are not designed for confidential data, long-term
storage, guaranteed delivery, or production load testing. Create a fresh
mailbox per test and forget it when the test finishes.

## Sending test mail through SMTP

GuerrillaMail has no direct send API. Let your application send normally, or
create the message in test setup with an SMTP client such as Nodemailer:

```js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.E2E_SMTP_HOST,
  port: Number(process.env.E2E_SMTP_PORT || 587),
  secure: process.env.E2E_SMTP_SECURE === 'true',
  auth: process.env.E2E_SMTP_USER
    ? { user: process.env.E2E_SMTP_USER, pass: process.env.E2E_SMTP_PASSWORD }
    : undefined,
});

await transporter.sendMail({
  from: 'test-no-reply@example.com',
  to: emailAddress,
  subject: 'Confirm your email',
  html: '<a href="https://example.com/confirm">Confirm your account</a>',
});

const email = await mailbox.waitForEmail('Confirm your email', 60);
```

Keep SMTP credentials in CI secrets and use a dedicated test account or relay.

## Development

```console
$ yarn install
$ yarn build
$ yarn test
```

The offline unit suite covers provider selection, fallback, MIME parsing, and
both package entry points.

With Bun, run the package scripts through Bun's script runner:

```console
$ bun run build
$ bun run lint
$ bun run test
```

Prefer `bun run test` over `bun test`: the latter invokes Bun's built-in test
runner directly and does not use this repository's Jest configuration.

## License

This library is released under the
[MIT license](https://opensource.org/licenses/MIT).
