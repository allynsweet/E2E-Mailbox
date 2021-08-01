import axios, { AxiosResponse, Method } from 'axios';
import { EmailResponse, MailboxProvider } from '../types';
import MailboxService from './mailboxService';
import { ParsedMail, simpleParser } from 'mailparser';

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

interface SendMessagePayload {
    subject: string;
    body: string;
    isHtml: boolean;
}

class DeveloperMailService extends MailboxService {
    API_URL = 'https://www.developermail.com/api/v1';
    PROVIDER: MailboxProvider = 'DEVELOPER';

    private token = '';
    private mailboxName = '';

    private async sendRequest(data: any, method: Method, endpoint: string): Promise<AxiosResponse | undefined> {
        try {
            // Set Authentication header for DeveloperMail
            const headers = !!this.token ? {
                'X-MailboxToken': this.token,
                'Content-Type': 'application/json'
            } : {};
            const payloadType = method === 'GET' ? 'params' : 'data';
            const response = await axios(`${this.API_URL}${endpoint}`, {
                [payloadType]: data, method, headers
            });
            return response;
        } catch (error) {
            if (!error.data) { return; }
        }
    }

    private async buildEmailResponse(message: string, mailId: string): Promise<EmailResponse> {
        const parsedMessage: ParsedMail = await simpleParser(message);
        const messageFrom = !!parsedMessage.from ? parsedMessage.from.text : '';
        const messageDate = parsedMessage.date ? `${parsedMessage.date.getTime()}` : '';
        const messageSubject = parsedMessage.subject || '';
        const messageBody = parsedMessage.html || '';
        // v1.0 read model was tied to GuerrillaMail's response type, for
        // compatibility-sake we will convert DeveloperMail to the same type.
        const email: EmailResponse = {
            mail_id: mailId,
            mail_from: messageFrom,
            mail_timestamp: messageDate,
            mail_subject: messageSubject,
            mail_excerpt: '',
            mail_body: messageBody
        };
        return email;
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
            emailListResponse.result, 'POST', `/mailbox/${this.mailboxName}/messages`
        );
        if (!getMessagesResponse) { return emailList; }
        const messages: GetMessagesResponse = getMessagesResponse.data;

        // Response value comes as Mime 1.0, we must parse this to conform with our
        // read model.
        for (let message of messages.result) {
            const email = await this.buildEmailResponse(message.value, message.key);
            emailList.push(email);
        }

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
            {}, 'DELETE', `/mailbox/${this.mailboxName}/messages/${emailId}`
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
        const responseData: string = response.data.result;
        const email: EmailResponse = await this.buildEmailResponse(responseData, emailId);
        return email;
    }

    async sendSelfMail(subject: string, body: string): Promise<boolean> {
        const payload: SendMessagePayload = { subject, body, isHtml: true };
        const response = await this.sendRequest(
            payload, 'PUT', `/mailbox/${this.mailboxName}/messages`
        );
        if (!response) { return false; }
        const responseData: boolean = response.data.result;
        return responseData;
    }
}

export default DeveloperMailService;
