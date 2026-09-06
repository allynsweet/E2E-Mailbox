interface MimeHeaders {
  [header: string]: string;
}

interface MimeContent {
  headers: MimeHeaders;
  body: string;
}

export interface ParsedEmail {
  from: string;
  date: string;
  subject: string;
  body: string;
}

interface ParsedEmailPart extends ParsedEmail {
  contentType: string;
}

/**
 * Parse the subset of MIME used by DeveloperMail's raw message responses.
 *
 * DeveloperMail is deprecated, so this parser intentionally avoids the large
 * stream-based mailparser dependency. It supports plain messages, common
 * transfer encodings, encoded headers, and multipart bodies.
 */
export function parseMimeMessage(rawMessage: string): ParsedEmail {
  const parsedPart = parseMimePart(...splitHeadersAndBody(rawMessage));
  return {
    from: parsedPart.from,
    date: parsedPart.date,
    subject: parsedPart.subject,
    body: parsedPart.body,
  };
}

function splitHeadersAndBody(content: string): [MimeHeaders, string] {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const separatorIndex = normalizedContent.indexOf('\n\n');
  const headerContent = separatorIndex === -1 ? normalizedContent : normalizedContent.slice(0, separatorIndex);
  const body = separatorIndex === -1 ? '' : normalizedContent.slice(separatorIndex + 2);
  const rawHeaders: MimeHeaders = {};
  let currentHeader = '';

  headerContent.split('\n').forEach((line) => {
    const isContinuation = line.startsWith(' ') || line.startsWith('\t');
    if (isContinuation && currentHeader) {
      rawHeaders[currentHeader] += ` ${line.trim()}`;
      return;
    }

    const separator = line.indexOf(':');
    if (separator === -1) return;
    currentHeader = line.slice(0, separator).trim().toLowerCase();
    rawHeaders[currentHeader] = line.slice(separator + 1).trim();
  });

  const headers: MimeHeaders = {};
  Object.keys(rawHeaders).forEach((header) => {
    headers[header] = header === 'content-type' ? rawHeaders[header] : decodeEncodedWords(rawHeaders[header]);
  });

  return [headers, body];
}

function parseMimePart(headers: MimeHeaders, body: string): ParsedEmailPart {
  const contentTypeHeader = headers['content-type'] || 'text/plain; charset=utf-8';
  const contentType = contentTypeHeader.split(';')[0].trim().toLowerCase();
  const boundary = getContentTypeParameter(contentTypeHeader, 'boundary');

  if (contentType.startsWith('multipart/') && boundary) {
    const childParts = splitMultipartBody(body, boundary)
      .map(splitHeadersAndBody)
      .map(([childHeaders, childBody]) => parseMimePart(childHeaders, childBody));
    const htmlPart = childParts.find((part) => part.contentType === 'text/html' && !!part.body);
    const textPart = childParts.find((part) => part.contentType === 'text/plain' && !!part.body);
    const selectedPart = htmlPart || textPart || childParts[0];

    if (selectedPart) return selectedPart;
    return createEmailPart(headers, '', contentType);
  }

  return createEmailPart(headers, decodeBody(body, headers), contentType);
}

function createEmailPart(headers: MimeHeaders, body: string, contentType: string): ParsedEmailPart {
  return {
    contentType,
    from: headers.from || '',
    date: headers.date || '',
    subject: headers.subject || '',
    body,
  };
}

function splitMultipartBody(body: string, boundary: string): string[] {
  const boundaryLine = `--${boundary}`;
  const finalBoundaryLine = `${boundaryLine}--`;
  const parts: string[] = [];
  let currentPart: string[] | undefined;

  body.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === boundaryLine) {
      if (currentPart) parts.push(currentPart.join('\n'));
      currentPart = [];
      return;
    }
    if (trimmedLine === finalBoundaryLine) {
      if (currentPart) parts.push(currentPart.join('\n'));
      currentPart = undefined;
      return;
    }
    if (currentPart) currentPart.push(line);
  });

  if (currentPart) parts.push(currentPart.join('\n'));
  return parts;
}

function decodeBody(body: string, headers: MimeHeaders): string {
  const encoding = (headers['content-transfer-encoding'] || '7bit').trim().toLowerCase();
  const charset = getContentTypeParameter(headers['content-type'] || '', 'charset') || 'utf-8';

  if (encoding === 'base64') {
    return decodeBuffer(Buffer.from(body.replace(/\s+/g, ''), 'base64'), charset);
  }
  if (encoding === 'quoted-printable') {
    return decodeQuotedPrintable(body, charset);
  }
  return body;
}

function decodeQuotedPrintable(body: string, charset: string): string {
  const content = body.replace(/=\r?\n/g, '');
  const bytes: number[] = [];

  for (let index = 0; index < content.length; index += 1) {
    const character = content.charAt(index);
    if (character === '=' && /^[0-9a-f]{2}$/i.test(content.substr(index + 1, 2))) {
      bytes.push(parseInt(content.substr(index + 1, 2), 16));
      index += 2;
    } else {
      bytes.push(character.charCodeAt(0));
    }
  }

  return decodeBuffer(Buffer.from(bytes), charset);
}

function decodeEncodedWords(value: string): string {
  const joinedValue = value.replace(/(\?=)\s+(=\?)/g, '$1$2');
  return joinedValue.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (encodedWord, charset, encoding, text) => {
    try {
      if (encoding.toLowerCase() === 'b') {
        return decodeBuffer(Buffer.from(text, 'base64'), charset);
      }

      const bytes: number[] = [];
      for (let index = 0; index < text.length; index += 1) {
        const character = text.charAt(index);
        if (character === '_') {
          bytes.push(32);
        } else if (character === '=' && /^[0-9a-f]{2}$/i.test(text.substr(index + 1, 2))) {
          bytes.push(parseInt(text.substr(index + 1, 2), 16));
          index += 2;
        } else {
          bytes.push(character.charCodeAt(0));
        }
      }
      return decodeBuffer(Buffer.from(bytes), charset);
    } catch {
      return encodedWord;
    }
  });
}

function decodeBuffer(buffer: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

function getContentTypeParameter(contentType: string, parameterName: string): string | undefined {
  const parameters = contentType.split(';').slice(1);
  const parameter = parameters.find((part) => {
    const [name] = part.trim().split('=');
    return name.trim().toLowerCase() === parameterName;
  });
  if (!parameter) return undefined;

  const value = parameter.slice(parameter.indexOf('=') + 1).trim();
  const quotedValue = /^"([\s\S]*)"$/.exec(value);
  return quotedValue ? quotedValue[1] : value;
}
