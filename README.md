# E2E Mailbox

E2E test your email notification system using [DeveloperMail API](https://www.developermail.com/) and [GuerrillaMail API](https://www.guerrillamail.com/).

## Description

A fully-typed and tested JS library for adding email notification testing to your E2E tests. Some use-cases include:

- Registering for site and checking for the welcome email
- Registering for a site and confirming your email address by pulling the URL from the email body
- Fetching a reset password pin from an email
- Ensuring your system sends the correct email after an action is committed on your website

Configurable to use either DeveloperMail or GuerrillaMail as the temporary mailbox providers. These are free services generously provided to create short-lived emails addresses. If one provider is not working, the other will be used automatically to prevent disruption.

## Usage

### Installation

Install the **E2E Mailbox** package with [NPM](https://www.npmjs.com/package/e2e-mailbox) or yarn:

```sh
npm install e2e-mailbox
yarn add e2e-mailbox
```

### Setup

#### Creating an Email Address

```js
import E2EMailbox from 'e2e-mailbox';
// This will create a new mailbox using DeveloperMail API as the provider.
// To set GuerrillaMail, pass 'GUERRILLA' to the constructor.
const mailbox = new E2EMailbox();
// This will generate a new email address for you to use in your tests
const emailAddress = await mailbox.createEmailAddress();
```

#### Wait for Email by Subject Line

After an email has been sent to the email address, you could poll for the email's subject line explicitly:

```js
// Set the subject line along with the max timeout in seconds, default is 60 seconds.
const email = await mailbox.waitForEmail('The Subject Line in your Email', 60);

// or you could use the promise chains if you fancy
mailbox.waitForEmail('The Subject Line in your Email').then((email) => {
  if (!email) {
    return;
  }
  // email is found and safe to use now.
});
```

#### Fetch All Emails in Mailbox

```js
// Returns an array of email responses
const emailList = await mailbox.fetchEmailList();
```

#### Fetch Email by ID

Each email has an `email_id` associated with it, this ID could be used to fetch all attachments and body of an email.

```js
const fullEmail = await mailbox.fetchEmailById(emailID);
```

#### Delete Email by ID

```js
const isEmailDeleted = await mailbox.deleteEmailById(email.mail_id);
```

### Example Usage in Tests

#### Checking if email was generated

The first test in the suite should generate a new email to be used by later tests.

```js
const mailbox = new IntegrationMailbox();
let emailAddress = '';
test('should generate an email properly', async () => {
  emailAddress = await mailbox.createEmailAddress();
  expect(emailAddress).toBeDefined();
});
```

#### Checking if email was sent

After registering for your service during the integration test, we should test to make sure the email was sent out in a timely manner.

```js
it('should send a confirm account email', async () => {
  // 'Confirm Your Email' is the subject line of the email in this case
  const foundEmail = await mailbox.waitForEmail('Confirm Your Email', 100);
  expect(!!foundEmail).toBeTruthy();
});
```

Next, if you have a confirmation link in the email, you could pull it from the email body:

```js
it('should confirm account and go to login page', async () => {
  expect(foundEmail).toBeDefined();
  if (!foundEmail) {
    return;
  }
  const urls = mailbox.extractLinksFromEmail(foundEmail);
  const confirmUrl = urls.filter((url) => url.includes('https://example.com/your_confirm_url'))[0];
  expect(confirmUrl).toBeDefined();
  if (!confirmUrl) {
    return;
  }
  // navigate to your confirmUrl in your test
});
```

## License

This library is released under the
[MIT license](https://opensource.org/licenses/MIT).
