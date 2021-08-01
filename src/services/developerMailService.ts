import axios, { AxiosResponse, Method } from 'axios';
import { EmailResponse, MailboxProvider } from '../types';
import MailboxService from './mailboxService';

interface CreateEmailResponse {
    name: string;
    token: string;
}

interface MessageIdsResponse {
    result: string[];
}
interface GetMessagesResponse {
    result: { key: string, value: string }[];
}

class DeveloperMailService extends MailboxService {
    API_URL = 'https://www.developermail.com/api/v1';
    private token = '';
    private mailboxName = '';

    private async sendRequest(params: any, method: Method, endpoint: string): Promise<AxiosResponse | undefined> {
        try {
            // Set Authentication header for DeveloperMail
            const headers = !!this.token ? {} : {
                'X-MailboxToken': this.token
            };
            const response = await axios(`${this.API_URL}${endpoint}`, {
                params, method, headers
            });
            return response;
        } catch (error) {
            if (!error.data) { return; }
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
        const response = await this.sendRequest({}, 'PUT', '/mailbox');
        if (!response) { return; }
        const creationResponse: CreateEmailResponse = response.data.result;
        const EMAIL_DOMAIN = 'developermail.com';
        this.token = creationResponse.token;
        this.mailboxName = creationResponse.name;
        return `${creationResponse.name}@${EMAIL_DOMAIN}`;
    }

    /**
     * Get the current list of emails from the email inbox.
     * @returns Array of emails
     */
    async fetchEmailList(): Promise<EmailResponse[]> {
        const emailList: EmailResponse[] = [];
        // Fetch list of message IDs present in the mailbox
        const getMessageIdsResponse = await this.sendRequest({}, 'GET', `/mailbox/${this.mailboxName}`);
        if (!getMessageIdsResponse) { return emailList; }
        const emailListResponse: MessageIdsResponse = getMessageIdsResponse.data;

        // Fetch list of messages from the IDs gathered in getMessageIdsResponse
        const getMessagesResponse = await this.sendRequest(
            emailListResponse.result, 'POST', `/mailbox/${this.mailboxName}`
        );
        if (!getMessagesResponse) { return emailList; }
        const messages: GetMessagesResponse = getMessagesResponse.data;

        // Response value comes as Mime 1.0, we must parse this to conform with our
        // read model.
        messages.result.forEach(message => {
            const splitResponse = message.value.split('\r\n');
            const messageFrom = splitResponse[1].split('From: ')[1];
            const messageDate = splitResponse[3].split('Date: ')[1];
            const messageSubject = splitResponse[4].split('Subject: ')[1];
            const messageBody = splitResponse[6].split('Content-Transfer-Encoding: ')[1];
            // v1.0 read model was tied to GuerrillaMail's response type, for
            // compatibility-sake we will convert DeveloperMail to the same type.
            const email: EmailResponse = {
                mail_id: message.key,
                mail_from: messageFrom,
                mail_timestamp: messageDate,
                mail_subject: messageSubject,
                mail_excerpt: '',
                mail_body: messageBody
            };
            emailList.push(email);
        })
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
    async forgetEmailAddress(): Promise<boolean | undefined> {
        const response = await this.sendRequest({}, 'DELETE', `/mailbox/${this.mailboxName}`);
        if (!response) { return; }
        const responseData: boolean = response.data.result;
        return responseData;
    }

    /**
     * Delete a specific email by ID.
     * @param emailId 
     * @returns true on success, false on failure
     */
    async deleteEmailById(emailId: string): Promise<boolean | undefined> {
        const response = await this.sendRequest(
            {}, 'DELETE', `/mailbox/${this.mailboxName}/messages/{${emailId}}`
        );
        if (!response) { return false; }
        return response.data.result;
    }

    /**
     * Get the contents of an email. All HTML in the body of the email is filtered. 
     * Eg, Javascript, applets, iframes, etc is removed. Subject and email excerpt are escaped using HTML Entities.
     * Only emails owned by the current session id can be fetched.
     * @param emailId 
     * @returns 
     */
    async fetchEmailById(emailId: string): Promise<EmailResponse | undefined> {
        const response = await this.sendRequest(
            {}, 'GET', `/mailbox/${this.mailboxName}/messages/${emailId}`
        );
        if (!response) { return; }
        const responseData: EmailResponse = response.data;
        return responseData;
    }
}

export default DeveloperMailService;
