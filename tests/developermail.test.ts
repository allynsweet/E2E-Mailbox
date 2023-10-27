import DeveloperMailService from '../src/services/developerMailService';
import { EmailResponse } from '../src/types';

const dmMailbox = new DeveloperMailService()
let dmEmailAddress: string | undefined;
const subjectLine = 'Welcome!';
let emailList: EmailResponse[] = [];

test('should generate an email for DeveloperMail properly', async () => {
    expect.assertions(2);
    dmEmailAddress = await dmMailbox.createEmailAddress();
    expect(dmEmailAddress).toBeDefined();
    if (!dmEmailAddress) { return; }
    expect(dmEmailAddress.includes('@')).toBeTruthy();
});

test('should send an email to own mailbox', async () => {
    expect.assertions(1);
    const emailHasSent = await dmMailbox.sendSelfMail(subjectLine, 'Testing email body.');
    expect(emailHasSent).toBeTruthy();
});

test('email should arrive in inbox', async () => {
    expect.assertions(2);
    await new Promise(r => setTimeout(r, 30000));
    emailList = await dmMailbox.fetchEmailList();
    expect(emailList.length).toEqual(1);
    if (emailList.length === 0) { return; }
    expect(emailList[0].mail_subject.includes(subjectLine)).toBeTruthy();
});


test('should delete email by ID', async () => {
    expect.assertions(2);
    const isEmailDeleted = await dmMailbox.deleteEmailById(emailList[0].mail_id);
    expect(isEmailDeleted).toBeTruthy();
    if (!isEmailDeleted) { return; }
    const secondEmailList = await dmMailbox.fetchEmailList();
    expect(secondEmailList.length).toEqual(0);
});

test('should forget email address', async () => {
    expect.assertions(2);
    expect(dmEmailAddress).toBeDefined();
    if (!dmEmailAddress) { return; }
    const isEmailForgotten = await dmMailbox.forgetEmailAddress();
    expect(isEmailForgotten).toBeTruthy();
});
