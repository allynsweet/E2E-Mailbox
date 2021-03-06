import E2EMailbox from '../src/index';
import { EmailResponse } from '../src/types';

const mailbox = new E2EMailbox('GUERRILLA');
let emailList: Array<EmailResponse> = [];
let emailAddress: string | undefined = '';
test('should generate an email properly', async () => {
    expect.assertions(2);
    emailAddress = await mailbox.createEmailAddress();
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    expect(emailAddress.includes('@')).toBeTruthy();
});

test('should return an email list with one email', async () => {
    expect.assertions(2);
    const foundEmail = await mailbox.waitForEmail('Welcome');
    expect(foundEmail).toBeDefined();
    emailList = await mailbox.fetchEmailList();
    expect(emailList.length).toEqual(1);
});

test('should fetch email by ID', async () => {
    expect.assertions(2);
    const fullEmail = await mailbox.fetchEmailById(emailList[0].mail_id);
    expect(fullEmail).toBeDefined();
    if (!fullEmail) { return; }
    expect(fullEmail.mail_body.length).toBeGreaterThan(150);
});

test('should wait for email', async () => {
    expect.assertions(2);
    const emailResponse: EmailResponse | undefined = await mailbox.waitForEmail(emailList[0].mail_subject);
    expect(emailResponse).toBeDefined();
    if (!emailResponse) { return; }
    expect(emailResponse.mail_subject).toEqual(emailList[0].mail_subject);
});

test('should pull urls from email body', async () => {
    expect.assertions(2);
    const email: EmailResponse = { ...emailList[0] };
    const website = 'https://example.com';
    email.mail_body += `<a href="${website}" />`
    const urls = await mailbox.extractLinksFromEmail(email);
    expect(urls.length).toEqual(1);
    expect(urls[0]).toEqual(website);
});

test('should delete email by ID', async () => {
    expect.assertions(2);
    const isEmailDeleted = await mailbox.deleteEmailById(emailList[0].mail_id);
    expect(isEmailDeleted).toBeTruthy();
    if (!isEmailDeleted) { return; }
    const secondEmailList = await mailbox.fetchEmailList();
    expect(secondEmailList.length).toEqual(0);
});

test('should forget email address', async () => {
    expect.assertions(2);
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    const isEmailForgotten = await mailbox.forgetEmailAddress(emailAddress);
    expect(isEmailForgotten).toBeTruthy();
});
