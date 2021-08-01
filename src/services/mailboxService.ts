import { EmailResponse } from '../types';

abstract class MailboxService {
    abstract API_URL: string;

    async sleep(timeInMs: number): Promise<void> {
        await new Promise(r => setTimeout(r, timeInMs));
    }

    /** --- Public Functions --- */

    /**
     * Initialize a session and set the client with an email address.
     * @returns email address
     */
    abstract createEmailAddress(): Promise<string | undefined>;


    /**
     * Get the current list of emails from the email inbox.
     * @returns Array of emails
     */
    abstract fetchEmailList(): Promise<EmailResponse[]>;


    /**
     * Forget the current email address. 
     * @param emailAddress 
     * @returns True on success, false on failure
     */
    abstract forgetEmailAddress(emailAddress: string): Promise<boolean | undefined>;

    /**
     * Delete a specific email by ID.
     * @param emailId 
     * @returns true on success, false on failure
     */
    abstract deleteEmailById(emailId: string): Promise<boolean | undefined>;

    /**
     * Get the contents of an email. All HTML in the body of the email is filtered. 
     * Eg, Javascript, applets, iframes, etc is removed. Subject and email excerpt are escaped using HTML Entities.
     * Only emails owned by the current session id can be fetched.
     * @param emailId 
     * @returns 
     */
    abstract fetchEmailById(emailId: string): Promise<EmailResponse | undefined>;

}

export default MailboxService;
