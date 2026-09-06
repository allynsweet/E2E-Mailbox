import E2EMailbox from '../src/index';
import { EmailResponse } from '../src/types';

const mailbox = new E2EMailbox('GUERRILLA');
let emailList: EmailResponse[] = [];
let emailAddress: string | undefined = '';
test('should generate an email properly', async () => {
    expect.assertions(2);
    emailAddress = await mailbox.createEmailAddress();
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    expect(emailAddress.includes('@')).toBeTruthy();
});

test('should return an email list', async () => {
    expect.assertions(2);
    emailList = await mailbox.fetchEmailList();
    expect(Array.isArray(emailList)).toBeTruthy();
    expect(emailList.length).toBeGreaterThanOrEqual(0);
});

test('should forget email address', async () => {
    expect.assertions(2);
    expect(emailAddress).toBeDefined();
    if (!emailAddress) { return; }
    const isEmailForgotten = await mailbox.forgetEmailAddress(emailAddress);
    expect(isEmailForgotten).toBeTruthy();
});
