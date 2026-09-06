import axios from 'axios';
import IntegrationMailbox from '../src/index';
import DeveloperMailService from '../src/services/developerMailService';

jest.mock('axios', () => {
    const axios = Object.assign(jest.fn(), {
        get: jest.fn(),
        isAxiosError: () => false
    });
    return { __esModule: true, default: axios };
});

const mockedAxios = axios as unknown as jest.Mock & { get: jest.Mock };

describe('mailbox sessions', () => {
    beforeEach(() => {
        mockedAxios.mockClear();
        mockedAxios.get.mockClear();
    });

    it('uses GuerrillaMail by default', async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                email_addr: 'testing@guerrillamailblock.com',
                sid_token: 'guerrilla-session'
            }
        });

        const mailbox = new IntegrationMailbox();
        const emailAddress = await mailbox.createEmailAddress();

        expect(emailAddress).toBe('testing@guerrillamailblock.com');
        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://api.guerrillamail.com/ajax.php',
            expect.objectContaining({
                params: expect.objectContaining({ f: 'get_email_address' })
            })
        );
    });

    it('falls back from the deprecated DeveloperMail provider', async () => {
        mockedAxios.mockRejectedValueOnce(new Error('DeveloperMail is unreachable'));
        mockedAxios.get.mockResolvedValueOnce({
            data: {
                email_addr: 'fallback@guerrillamailblock.com',
                sid_token: 'fallback-session'
            }
        });

        const mailbox = new IntegrationMailbox('DEVELOPER');
        const emailAddress = await mailbox.createEmailAddress();

        expect(emailAddress).toBe('fallback@guerrillamailblock.com');
        expect(mockedAxios).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
});

describe('DeveloperMail MIME conversion', () => {
    beforeEach(() => {
        mockedAxios.mockClear();
        mockedAxios.get.mockClear();
    });

    it('decodes plain quoted-printable messages and encoded headers', async () => {
        mockedAxios.mockResolvedValueOnce({
            data: {
                result: [
                    'From: Sender <sender@example.com>',
                    'Subject: =?UTF-8?B?V2VsY29tZSE=?=',
                    'Date: Sat, 06 Sep 2025 12:00:00 +0000',
                    'Content-Type: text/plain; charset=utf-8',
                    'Content-Transfer-Encoding: quoted-printable',
                    '',
                    'Caf=C3=A9'
                ].join('\n')
            }
        });

        const email = await new DeveloperMailService().fetchEmailById('message-1');

        expect(email).toEqual({
            mail_id: 'message-1',
            mail_from: 'Sender <sender@example.com>',
            mail_timestamp: '1757160000000',
            mail_subject: 'Welcome!',
            mail_excerpt: '',
            mail_body: 'Café'
        });
    });

    it('prefers the HTML part of a multipart message', async () => {
        mockedAxios.mockResolvedValueOnce({
            data: {
                result: [
                    'From: Sender <sender@example.com>',
                    'Subject: Welcome!',
                    'Content-Type: multipart/alternative; boundary="MAIL-BOUNDARY"',
                    '',
                    '--MAIL-BOUNDARY',
                    'Content-Type: text/plain; charset=utf-8',
                    '',
                    'Hello',
                    '--MAIL-BOUNDARY',
                    'Content-Type: text/html; charset=utf-8',
                    'Content-Transfer-Encoding: base64',
                    '',
                    'PGh0bWw+SGVsbG88L2h0bWw+',
                    '--MAIL-BOUNDARY--'
                ].join('\n')
            }
        });

        const email = await new DeveloperMailService().fetchEmailById('message-2');
        expect(email?.mail_body).toBe('<html>Hello</html>');
    });
});
