# E2E Mailbox
E2E test your email notification system using [GuerrillaMail API](https://www.guerrillamail.com/).

## Description
A fully-typed and tested JS library for adding email notification testing to your E2E tests. Some use-cases include:
* Registering for site and checking for the welcome email 
* Registering for a site and confirming your email address by pulling the URL from the email body
* Fetching a reset password pin from an email
* Ensuring your system sends the correct email after an action is committed on your website


## Usage

### Installation

Install the **E2E Mailbox** package with [NPM](https://www.npmjs.org/) or yarn:

```sh
npm install e2e-mailbox
yarn add e2e-mailbox
```
### Setup
#### Creating an Email Address
```js
import IntegrationMailbox from 'int-test-mail'

const mailbox = new IntegrationMailbox();
// This will generate a new email address for you to use in your tests
const emailAddress = await mailbox.createEmailAddress();
```
#### Wait for Email by Subject Line
After an email has been sent to the email address, you could poll for the email's subject line explicitly:
```js
// Set the subject line along with the max timeout in seconds, default is 60 seconds.
const email = await mailbox.waitForEmail('The Subject Line in your Email', 60);

// or you could use the promise chains if you fancy
mailbox.waitForEmail('The Subject Line in your Email').then(email => {
  if (!email) { return; }
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
## License

This library is released under the
[MIT license](https://opensource.org/licenses/MIT).
