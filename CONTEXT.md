# E2E Mailbox

E2E Mailbox is a test-focused boundary between automated tests and external
temporary-email providers.

## Language

**Mailbox provider**:
An external temporary-email service that owns the address and inbox used by a test.
_Avoid_: email backend, email API

**Active provider**:
The provider actually handling the current mailbox after fallback has occurred.
_Avoid_: selected provider, default provider

**Fallback**:
The one-time switch to the other supported provider when the requested provider cannot establish a mailbox.
_Avoid_: retry, recovery

**Temporary mailbox**:
A short-lived email address used for verification during automated tests.
_Avoid_: disposable email, throwaway inbox

**Self-mail**:
A message sent to the active mailbox by the code under test to trigger the notification flow.
_Avoid_: test email, sample email
