export type MailboxProvider = 'DEVELOPER' | 'GUERRILLA';

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