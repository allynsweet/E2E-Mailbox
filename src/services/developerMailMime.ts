import * as TypeScriptEmailParser from 'typescript-email-parser';
import { EmailResponse } from '../types.js';

const { Email } = TypeScriptEmailParser;

const MAX_MESSAGE_BYTES = 10 * 1024 * 1024;

/**
 * Convert a DeveloperMail RFC822 response to the v1.0 GuerrillaMail-shaped
 * read model while reusing an existing, bundler-safe MIME parser.
 */
export function convertDeveloperMailMessage(message: string, mailId: string): EmailResponse {
    const parsedMessage = Email.parse(message, {
        encoding: 'utf-8',
        maxBytes: MAX_MESSAGE_BYTES
    });

    if (!parsedMessage) {
        throw new Error('Could not parse the DeveloperMail message.');
    }

    const parsedDate = parsedMessage.date()?.to_date();
    const parsedTimestamp = parsedDate ? parsedDate.getTime() : NaN;
    const hasHtmlBody = parsedMessage.html_parts().some(part => part.is_text_html());
    const body = hasHtmlBody
        ? parsedMessage.body_html(0) || ''
        : parsedMessage.body_text(0) || '';

    return {
        mail_id: mailId,
        mail_from: formatAddress(parsedMessage.from()),
        mail_timestamp: Number.isNaN(parsedTimestamp) ? '' : `${parsedTimestamp}`,
        mail_subject: parsedMessage.subject() || '',
        mail_excerpt: '',
        mail_body: body
    };
}

function formatAddress(address: TypeScriptEmailParser.Address | undefined): string {
    if (!address) return '';

    if (address.kind === 'list') {
        return address.value.map(formatMailbox).filter(Boolean).join(', ');
    }

    return address.value
        .map((group: TypeScriptEmailParser.Group) => {
            const recipients = group.addresses.map(formatMailbox).filter(Boolean).join(', ');
            return group.name ? `${group.name}: ${recipients};` : recipients;
        })
        .filter(Boolean)
        .join(', ');
}

function formatMailbox(mailbox: TypeScriptEmailParser.Mailbox): string {
    const address = mailbox.address || '';
    return mailbox.name ? `${mailbox.name} <${address}>` : address;
}
