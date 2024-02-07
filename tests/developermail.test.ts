import IntegrationMailbox from '../src/index';
import { EmailResponse } from '../src/types';

describe("when using DeveloperMail", () => {
    const mailbox = new IntegrationMailbox("DEVELOPER")

    let emailAddress: string;
    const subjectLine = 'Welcome!';
    let emailList: EmailResponse[] = [];

    beforeAll(async () => {
        emailAddress = await mailbox.createEmailAddress();
    })

    it("should generate an email properly", () => {
        expect(emailAddress.includes('@')).toBeTruthy();
    })

    it('should send an email to own mailbox', async () => {
        const emailHasSent = await mailbox.sendSelfMail(subjectLine, 'Testing email body.');
        expect(emailHasSent).toBeTruthy();
    });

    it('email should arrive in inbox', async () => {
        await new Promise(r => setTimeout(r, 30000));
        emailList = await mailbox.fetchEmailList();
        expect(emailList.length).toEqual(1);
        expect(emailList[0].mail_subject.includes(subjectLine)).toBeTruthy();
    });

    it('should delete email by ID', async () => {
        const isEmailDeleted = await mailbox.deleteEmailById(emailList[0].mail_id);
        expect(isEmailDeleted).toBeTruthy();
        const secondEmailList = await mailbox.fetchEmailList();
        expect(secondEmailList.length).toEqual(0);
    });

    it('should wait for an email to arrive', async () => {
        const selfSubjectLine = "Awaiting";

        await mailbox.sendSelfMail(subjectLine, 'Testing email body.');
        const foundEmail = await mailbox.waitForEmail(selfSubjectLine);

        expect(foundEmail).toBeDefined();
    });

    it('should forget email address', async () => {
        const isEmailForgotten = await mailbox.forgetEmailAddress(emailAddress);
        expect(isEmailForgotten).toBeTruthy();
    });
})
