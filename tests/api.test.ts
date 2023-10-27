import E2EMailbox from '../src/index';
import { EmailResponse } from '../src/types';

const mailbox = new E2EMailbox();
let emailList: EmailResponse[] = [];
let emailAddress: string | undefined = '';
test('should generate an email properly', async () => {
    expect.assertions(2);
    emailAddress = await mailbox.createEmailAddress();
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    expect(emailAddress.includes('@')).toBeTruthy();
});

test('should return an email list with no emails', async () => {
    expect.assertions(1);
    emailList = await mailbox.fetchEmailList();
    expect(emailList.length).toEqual(0);
});

test('should forget email address', async () => {
    expect.assertions(2);
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    const isEmailForgotten = await mailbox.forgetEmailAddress(emailAddress);
    expect(isEmailForgotten).toBeTruthy();
});
