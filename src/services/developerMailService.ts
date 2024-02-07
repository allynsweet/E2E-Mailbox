import axios, { AxiosResponse, Method } from 'axios';
import { EmailResponse, MailboxProvider } from '../types';
import MailboxService from './mailboxService';
import { ParsedMail, simpleParser } from 'mailparser';

interface CreateEmailResponse {
    result: {
        name: string;
        token: string;
    }
}

interface ForgetEmailResponse {
    result: boolean
}

interface MessageIdsResponse {
    result: string[];
}

interface DeleteEmailResponse {
    result: boolean
}

interface GetMessagesResponse {
    result: { key: string, value: string }[] | null;
}

interface SendSelfEmailResponse {
    result: boolean;
}

interface FetchEmailByIdResponse {
    result: string;
}

interface SendMessagePayload {
    subject: string;
    body: string;
    isHtml: boolean;
}

interface Mailbox {
    token: string;
    name: string;
    email: string;
}

class DeveloperMailService extends MailboxService {
    API_URL = 'https://www.developermail.com/api/v1';
    PROVIDER: MailboxProvider = 'DEVELOPER';

    private token = '';
    private mailboxName = '';

    /**
     * Send request to DeveloperMail API.
     * @param data
     * @param method
     * @param endpoint
     * @returns AxiosResponse on success, undefined on failure.
     */
    private async sendRequest<T>(data: any, method: Method, endpoint: string): Promise<AxiosResponse<T> | undefined> {
        try {
            // Set Authentication header for DeveloperMail
            const headers = !!this.token ? {
                'X-MailboxToken': this.token,
                'Content-Type': 'application/json'
            } : {};
            const payloadType = method === 'GET' ? 'params' : 'data';
            return axios<T>(`${this.API_URL}${endpoint}`, {
                [payloadType]: data, method, headers
            });
        } catch (error) {
            return;
        }
    }

    /**
     * Convert Mime-Type response from DeveloperMail to EmailResponse
     * @param message
     * @param mailId
     * @returns generated EmailResponse
     */
    private static async convertMimeToEmailResponse(message: string, mailId: string): Promise<EmailResponse> {
        const parsedMessage: ParsedMail = await simpleParser(message);
        const messageFrom = !!parsedMessage.from ? parsedMessage.from.text : '';
        const messageDate = parsedMessage.date ? `${parsedMessage.date.getTime()}` : '';
        const messageSubject = parsedMessage.subject || '';
        const messageBody = parsedMessage.html || '';
        // v1.0 read model was tied to GuerrillaMail's response type, for
        // compatibility-sake we will convert DeveloperMail to the same type.
        return {
            mail_id: mailId,
            mail_from: messageFrom,
            mail_timestamp: messageDate,
            mail_subject: messageSubject,
            mail_excerpt: '',
            mail_body: messageBody
        };
    }

    /**
     * Initialize a session and set the client with an email address. If the session already exists,
     * then it will return the email address details of the existing session. If a new session needs to be created, then it
     * will first check for the SUBSCR cookie to create a session for a subscribed address, otherwise it will create new email
     * address randomly.
     * @returns email address
     */
    async createEmailAddress(): Promise<string> {
        const response = await this.sendRequest<CreateEmailResponse>({}, 'PUT', '/mailbox');
        if (!response) throw new Error("Could not create email address")
        const creationResponse = response.data;
        const EMAIL_DOMAIN = 'developermail.com';
        this.token = creationResponse.result.token;
        this.mailboxName = creationResponse.result.name;
        return `${creationResponse.result.name}@${EMAIL_DOMAIN}`;
    }

    /**
     * Get the current list of emails from the email inbox.
     * @returns Array of emails
     */
    async fetchEmailList(): Promise<EmailResponse[]> {
        const emailList: EmailResponse[] = [];
        // Fetch list of message IDs present in the mailbox
        const getMessageIdsResponse = await this.sendRequest<MessageIdsResponse>({}, 'GET', `/mailbox/${this.mailboxName}`);
        if (!getMessageIdsResponse) { return emailList; }
        const emailListResponse = getMessageIdsResponse.data;

        // Fetch list of messages from the IDs gathered in getMessageIdsResponse
        const getMessagesResponse = await this.sendRequest<GetMessagesResponse>(
            emailListResponse.result, 'POST', `/mailbox/${this.mailboxName}/messages`
        );
        if (!getMessagesResponse) { return emailList; }
        const { result } = getMessagesResponse.data;

        if(!result) return emailList;

        // Response value comes as Mime 1.0, we must parse this to conform with our
        // read model.
        for (const message of result) {
            const email = await DeveloperMailService.convertMimeToEmailResponse(message.value, message.key);
            emailList.push(email);
        }

        return emailList;
    }

    /**
     * Forget the current email address. This will not stop the session, the existing session will be maintained.
     * A subsequent call to get_email_address will fetch a new email address or the client can call set_email_user
     * to set a new address. Typically, a user would want to set a new address manually after clicking the
     * ‘forget me’ button.
     * @returns True on success, false on failure
     */
    async forgetEmailAddress(): Promise<boolean | undefined> {
        const response = await this.sendRequest<ForgetEmailResponse>({}, 'DELETE', `/mailbox/${this.mailboxName}`);
        return !!response?.data?.result;
    }

    /**
     * Delete a specific email by ID.
     * @param emailId
     * @returns true on success, false on failure
     */
    async deleteEmailById(emailId: string): Promise<boolean> {
        const response = await this.sendRequest<DeleteEmailResponse>(
            {}, 'DELETE', `/mailbox/${this.mailboxName}/messages/${emailId}`
        );
        return !!response?.data?.result ?? false;
    }

    /**
     * Get the contents of an email. All HTML in the body of the email is filtered.
     * Eg, Javascript, applets, iframes, etc is removed. Subject and email excerpt are escaped using HTML Entities.
     * Only emails owned by the current session id can be fetched.
     * @param emailId
     * @returns
     */
    async fetchEmailById(emailId: string): Promise<EmailResponse> {
        const response = await this.sendRequest<FetchEmailByIdResponse>(
            {}, 'GET', `/mailbox/${this.mailboxName}/messages/${emailId}`
        );
        if (!response) throw new Error("Could not find email with id: " + emailId);
        const responseData: string = response.data.result;
        return DeveloperMailService.convertMimeToEmailResponse(responseData, emailId);
    }

    async sendSelfMail(subject: string, body: string): Promise<boolean> {
        const payload: SendMessagePayload = { subject, body, isHtml: true };
        const response = await this.sendRequest<SendSelfEmailResponse>(
            payload, 'PUT', `/mailbox/${this.mailboxName}/messages`
        );
        return !!response?.data?.result;
    }
}

export default DeveloperMailService;
