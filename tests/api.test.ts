import IntegrationMailbox, { EmailResponse } from '../src/index';

const mailer = new IntegrationMailbox();
let emailList: Array<EmailResponse> = [];
let emailAddress: string | undefined = '';
test('should generate an email properly', async () => {
    emailAddress = await mailer.createEmailAddress();
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    expect(emailAddress.includes('@')).toBeTruthy();
});

test('should return an email list with one email', async () => {
    emailList = await mailer.fetchEmailList();
    expect(emailList.length).toEqual(1);
});

test('should fetch email by ID', async () => {
    const fullEmail = await mailer.fetchEmailById(emailList[0].mail_id);
    expect(fullEmail).toBeDefined();
    if (!fullEmail) { return; }
    expect(fullEmail.mail_body.length).toBeGreaterThan(250);
});

test('should wait for email', async () => {
    const emailResponse: EmailResponse | undefined = await mailer.waitForEmail(emailList[0].mail_subject);
    expect(emailResponse).toBeDefined();
    if (!emailResponse) { return; }
    expect(emailResponse.mail_subject).toEqual(emailList[0].mail_subject);
});

test('should pull urls from email body', async () => {
    const email: EmailResponse = { ...emailList[0] };
    const website = 'https://example.com';
    email.mail_body += `<a href="${website}" />`
    const urls = await mailer.extractLinksFromEmail(email);
    expect(urls.length).toEqual(1);
    expect(urls[0]).toEqual(website);
});

test('should delete email by ID', async () => {
    const isEmailDeleted = await mailer.deleteEmailById(emailList[0].mail_id);
    expect(isEmailDeleted).toBeTruthy();
    if (!isEmailDeleted) { return; }
    const secondEmailList = await mailer.fetchEmailList();
    expect(secondEmailList.length).toEqual(0);
});

test('should forget email address', async () => {
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    const isEmailForgotten = await mailer.forgetEmailAddress(emailAddress);
    expect(isEmailForgotten).toBeTruthy();
});
