import axios, { AxiosResponse } from 'axios';

export interface CreateEmailResponse {
    email_addr: string;
    email_timestamp: number;
    alias: string;
    sid_token: string;
}

export interface EmailListResponse {
    list: EmailResponse[];
}

export interface EmailResponse {
    mail_id: string;
    mail_from: string;
    mail_timestamp: string;
    mail_subject: string;
    mail_excerpt: string;
    mail_body: string;
}

export interface SetEmailResponse {
    email_addr: string;
    email_timestamp: string;
    s_active: string;
    s_date: string;
    s_time: string;
    s_time_expires: string;
}

export default class IntegrationMailbox {
    private API_URL = 'http://api.guerrillamail.com/ajax.php'

    private sidToken = '';

    /**
     * Sends request to Guerrilla Mail API with required parameters.
     * @param payload
     * @returns EmailResponse | undefined
     */
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

    private async sleep(timeInMs: number): Promise<void> {
        await new Promise(r => setTimeout(r, timeInMs));
    }

    /** --- Public Functions --- */

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

    /**
     * Wait for email to arrive in inbox, and return the fetched email
     * @param subjectLine - the subject line belonging to the email.
     * @param maxLimit - the max time to wait for the email to arrive, default is 1 minute.
     * @returns EmailResponse | undefined
     */
    async waitForEmail(subjectLine: string, maxLimitInSec = 60): Promise<EmailResponse | undefined> {
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
                await this.sleep(INCREMENT);
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
