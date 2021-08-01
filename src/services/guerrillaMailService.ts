import axios, { AxiosResponse } from 'axios';
import { CreateEmailResponse, EmailListResponse, EmailResponse, MailboxProvider, SetEmailResponse } from '../types';
import MailboxService from './mailboxService';

class GuerrillaMailService extends MailboxService {
    API_URL = 'http://api.guerrillamail.com/ajax.php';
    PROVIDER: MailboxProvider = 'GUERRILLA';
    private sidToken = '';

    private async sendRequest(payload: any, isRetry = 0): Promise<AxiosResponse | undefined> {
        try {
            // "ip" and "agent" are required parameters, those values were taken straight from
            // Guerilla's API docs.
            const params = {
                ...payload, sid_token: this.sidToken, ip: '127.0.0.1', agent: 'Mozilla_foo_bar',
            };
            const response = await axios.get(this.API_URL, { params });
            return response;
        } catch (error) {
            if (!error.data) { return; }
            // Automatically retry 3 times if it's a 502 error
            if (error.data.includes('502 Bad Gateway') && isRetry < 3) {
                // Wait 3 seconds before retrying if there's a 502 error.
                await this.sleep(3000);
                const response = await this.sendRequest(payload, isRetry + 1);
                return response;
            }
        }
    }


    /**
     * Initialize a session and set the client with an email address. If the session already exists, 
     * then it will return the email address details of the existing session. If a new session needs to be created, then it
     * will first check for the SUBSCR cookie to create a session for a subscribed address, otherwise it will create new email
     * address randomly.
     * @returns email address
     */
    async createEmailAddress(): Promise<string | undefined> {
        const payload = { f: 'get_email_address' };
        const response = await this.sendRequest(payload);
        if (!response) { return; }
        const creationResponse: CreateEmailResponse = response.data;
        this.sidToken = creationResponse.sid_token;
        return creationResponse.email_addr;
    }

    /**
     * Get the current list of emails from the email inbox.
     * @returns Array of emails
     */
    async fetchEmailList(): Promise<EmailResponse[]> {
        let emailList: EmailResponse[] = [];
        const payload = { f: 'get_email_list', offset: 0 };
        const response = await this.sendRequest(payload);
        if (!response) { return emailList; }
        const emailListResponse: EmailListResponse = response.data;
        emailList = emailListResponse.list;
        return emailList;
    }


    /**
     * Set the email address to a different email address. If the email address is a subscriber, 
     * then return the subscription details. If the email is not a subscriber, then the email address
     * will be given 60 minutes again. A new email address will be generated if the email address is 
     * not in the database and a welcome email message will be generated.
     * @param emailAddress 
     * @returns True on success, false on failure
     */
    async setEmailAddress(emailAddress: string): Promise<SetEmailResponse | undefined> {
        // If a full email is passed, only use the username portion.
        const emailUsername = emailAddress.split('@')[0];
        const payload = { f: 'set_email_user', lang: 'en', email_user: emailUsername };
        const response = await this.sendRequest(payload);
        if (!response) { return; }
        const responseData: SetEmailResponse = response.data;
        return responseData;
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
        const payload = { f: 'forget_me', lang: 'en', email_addr: emailAddress };
        const response = await this.sendRequest(payload);
        if (!response) { return; }
        const responseData: boolean = response.data;
        return responseData;
    }

    /**
     * Delete a specific email by ID.
     * @param emailId 
     * @returns true on success, false on failure
     */
    async deleteEmailById(emailId: string): Promise<boolean | undefined> {
        const payload = { f: 'del_email', lang: 'en', 'email_ids[]': emailId };
        const response = await this.sendRequest(payload);
        if (!response) { return; }
        const responseData: string = response.data;
        // API returns an empty string as body on success.
        return !!responseData;
    }

    /**
     * Get the contents of an email. All HTML in the body of the email is filtered. 
     * Eg, Javascript, applets, iframes, etc is removed. Subject and email excerpt are escaped using HTML Entities.
     * Only emails owned by the current session id can be fetched.
     * @param emailId 
     * @returns 
     */
    async fetchEmailById(emailId: string): Promise<EmailResponse | undefined> {
        const payload = { f: 'fetch_email', email_id: emailId };
        const response = await this.sendRequest(payload);
        if (!response) { return; }
        const responseData: EmailResponse = response.data;
        return responseData;
    }
}

export default GuerrillaMailService;
