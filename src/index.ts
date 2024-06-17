import DeveloperMailService from './services/developerMailService';
import GuerrillaMailService from './services/guerrillaMailService';
import MailboxService from './services/mailboxService';
import { EmailResponse, MailboxProvider } from './types';

export default class IntegrationMailbox {

    private mailboxProviders: Record<MailboxProvider, MailboxService> = {
        'GUERRILLA': new GuerrillaMailService(),
        'DEVELOPER': new DeveloperMailService()
    }

    private mailbox: MailboxService;

    /** --- Public Functions --- */

    /**
     * Creates a mailbox session with the designated provider. By default,
     * DeveloperMail API will be used.
     * @param mailboxProvider
     */
    constructor(mailboxProvider: MailboxProvider = 'DEVELOPER') {
        this.mailbox = this.mailboxProviders[mailboxProvider];
    }

    /**
     * Initialize a session and set the client with an email address.
     * If one email service is not working, the backup will be used
     * automatically to prevent disruption.
     * @returns email address
     */
    async createEmailAddress(): Promise<string> {
      try {
        return this.mailbox.createEmailAddress();
      } catch {
        const newMailbox: MailboxProvider = this.mailbox.PROVIDER === 'DEVELOPER'
          ? 'GUERRILLA'
          : 'DEVELOPER';
        this.mailbox = this.mailboxProviders[newMailbox];
        // Attempt to create an email address again using a different provider.
        return this.mailbox.createEmailAddress();
      }
    }

    /**
     * Send an email to this mailbox. Only works for the DeveloperMail provider.
     * @param subject
     * @param body
     * @returns A `boolean` representing success or failure.
     */
    async sendSelfMail(subject: string, body: string): Promise<boolean> {
        return this.mailbox.sendSelfMail(subject, body);
    }

    /**
     * Get the current list of emails from the email inbox.
     * @returns Array of emails
     */
    fetchEmailList(): Promise<EmailResponse[]> {
        return this.mailbox.fetchEmailList();
    }

    /**
     * Forget the current email address. This will delete the mailbox and any emails
     * it contains.
     * @param emailAddress
     * @returns True on success, false on failure
     */
    forgetEmailAddress(emailAddress: string): Promise<boolean | undefined> {
        return this.mailbox.forgetEmailAddress(emailAddress);
    }

    /**
     * Delete a specific email by ID.
     * @param emailId
     * @returns true on success, false on failure
     */
    deleteEmailById(emailId: string): Promise<boolean | undefined> {
        return this.mailbox.deleteEmailById(emailId);
    }

    /**
     * Get the contents of an email. All HTML in the body of the email is filtered.
     * Eg, Javascript, applets, iframes, etc is removed. Subject and email excerpt are escaped using HTML Entities.
     * Only emails owned by the current session id can be fetched.
     * @param emailId
     * @returns
     */
    fetchEmailById(emailId: string): Promise<EmailResponse | undefined> {
        return this.mailbox.fetchEmailById(emailId);
    }

    /**
     * Wait for email to arrive in inbox, and return the fetched email
     * @param subjectLine - the subject line belonging to the email.
     * @param maxLimitInSec - the max time to wait for the email to arrive, default is 60 seconds.
     * @returns EmailResponse | undefined
     */
    async waitForEmail(subjectLine: string, maxLimitInSec = 60): Promise<EmailResponse | undefined> {
        let hasEmailArrived = false;
        let elapsedTime = 0;
        let foundEmail: EmailResponse | undefined;
        const maxLimitInMs = maxLimitInSec * 1000;
        const INCREMENT = 5000;
        // Check email every 5 seconds until the email is found
        // or the maxLimit is reached.
        while (elapsedTime < maxLimitInMs && !hasEmailArrived) {
            let emails: EmailResponse[] = [];
            try { emails = await this.fetchEmailList(); } catch(e) { throw new Error(`Failed fetching email list: ${e}`); }

            // eslint-disable-next-line no-loop-func
            emails.forEach((email) => {
                if (email.mail_subject.includes(subjectLine)) {
                    hasEmailArrived = true;
                    foundEmail = email;
                }
            });
            // If email hasn't arrived yet, wait and add time to elapsed time.
            if (!hasEmailArrived) {
                await this.mailbox.sleep(INCREMENT);
                elapsedTime += INCREMENT;
            }
        }
        // If the email was found, fetch the full email by ID.
        if (foundEmail) {
            foundEmail = await this.fetchEmailById(foundEmail.mail_id)
        }
        return foundEmail;
    }

    /**
     * Extract all urls from <a> hrefs from an email body. This will be returned
     * as an array of strings containing the urls.
     * @param email
     * @returns all hrefs from an email body
     */
    extractLinksFromEmail(email: EmailResponse): string[] {
        const extractedUrls: string[] = [];
        const splitEmailBody = email.mail_body.split('href="');
        const urlElements = splitEmailBody.filter(emailBodyLine =>
            emailBodyLine.substring(0, 4) === 'http'
            || emailBodyLine.substring(0, 4) === 'www.');
        urlElements.forEach(splitUrl => {
            // splitUrl looks like `example.com/" />...` right now
            const fullUrl = splitUrl.split('"')[0];
            extractedUrls.push(fullUrl);
        });
        return extractedUrls;
    }
}
