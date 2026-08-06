class GmailNotConfigured(Exception):
    """Raised when Gmail sync is used without GOOGLE_OAUTH_CLIENT_ID/SECRET set - the rest of the module
    (viewing already-synced messages, acknowledging them) still works with no key configured at all,
    matching the same fail-closed pattern as contract_payments.LegalAgentNotConfigured."""
