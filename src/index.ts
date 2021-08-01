import axios, { AxiosResponse } from 'axios';
import DeveloperMailService from './services/developerMailService';
import GuerrillaMailService from './services/guerrillaMailService';
import MailboxService from './services/mailboxService';
import { EmailResponse, MailboxProvider } from './types';

const noMailboxError = 'There is currently no mailbox set. Did you forget to call `createEmailAddress` first?';

export default class IntegrationMailbox {

    private mailboxProviders = {
        'GUERRILLA': new GuerrillaMailService(),
        'DEVELOPER': new DeveloperMailService()
    }

    private mailbox: MailboxService | undefined;

    /** --- Public Functions --- */

    constructor(mailboxProvider: MailboxProvider = 'DEVELOPER') {
        this.mailbox = this.mailboxProviders[mailboxProvider];
    }

    /**
     * Initialize a session and set the client with an email address. If the session already exists, 
     * then it will return the email address details of the existing session. If a new session needs to be created, then it
     * will first check for the SUBSCR cookie to create a session for a subscribed address, otherwise it will create new email
     * address randomly.
     * @returns email address
     */
    async createEmailAddress(): Promise<string | undefined> {
        if (!this.mailbox) { throw Error(noMailboxError); }
        let email = await this.mailbox.createEmailAddress();
        // If service cannot create an address, use the opposite provider.
        if (!email) {
            const newMailbox: MailboxProvider = this.mailbox.PROVIDER === 'DEVELOPER' ? 'GUERRILLA' : 'DEVELOPER';
            this.mailbox = this.mailboxProviders[newMailbox];
            // Attempt to create an email address again using a different provider.
            email = await this.mailbox.createEmailAddress();
        }
        return email;
    }

    /**
     * Get the current list of emails from the email inbox.
     * @returns Array of emails
     */
    async fetchEmailList(): Promise<EmailResponse[]> {
        if (!this.mailbox) { throw Error(noMailboxError); }
        const emailList: EmailResponse[] = await this.mailbox.fetchEmailList();
        return emailList;
    }

    /**
     * Forget the current email address. This will not stop the session, the existing session will be maintained.
     * A subsequent call to get_email_address will fetch a new email address or the client can call set_email_user
     * to set a new address. Typically, a user would want to set a new address manually after clicking the 
     * ‘forget me’ button.
     * @param emailAddress 
     * @returns True on success, false on failure
     */
    async forgetEmailAddress(emailAddress: string): Promise<boolean | undefined> {
        if (!this.mailbox) { throw Error(noMailboxError); }
        const isAddressDeleted = await this.mailbox.forgetEmailAddress(emailAddress);
        return isAddressDeleted;
    }

    /**
     * Delete a specific email by ID.
     * @param emailId 
     * @returns true on success, false on failure
     */
    async deleteEmailById(emailId: string): Promise<boolean | undefined> {
        if (!this.mailbox) { throw Error(noMailboxError); }
        const isEmailDeleted = await this.mailbox.deleteEmailById(emailId);
        return isEmailDeleted;
    }

    /**
     * Get the contents of an email. All HTML in the body of the email is filtered. 
     * Eg, Javascript, applets, iframes, etc is removed. Subject and email excerpt are escaped using HTML Entities.
     * Only emails owned by the current session id can be fetched.
     * @param emailId 
     * @returns 
     */
    async fetchEmailById(emailId: string): Promise<EmailResponse | undefined> {
        if (!this.mailbox) { throw Error(noMailboxError); }
        const email = this.mailbox.fetchEmailById(emailId);
        return email;
    }

    /**
     * Wait for email to arrive in inbox, and return the fetched email
     * @param subjectLine - the subject line belonging to the email.
     * @param maxLimit - the max time to wait for the email to arrive, default is 1 minute.
     * @returns EmailResponse | undefined
     */
    async waitForEmail(subjectLine: string, maxLimitInSec = 60): Promise<EmailResponse | undefined> {
        if (!this.mailbox) { throw Error(noMailboxError); }
        let hasEmailArrived = false;
        let elapsedTime = 0;
        let foundEmail: EmailResponse | undefined;
        const maxLimitInMs = maxLimitInSec * 1000;
        const INCREMENT = 7500;
        // Check email every 7.5 seconds until the email is found
        // or the maxLimit is reached.
        while (elapsedTime < maxLimitInMs && !hasEmailArrived) {
            const emails = await this.fetchEmailList();
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
