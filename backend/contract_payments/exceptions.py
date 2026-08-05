class PaymentNotVerified(Exception):
    """Raised when releasing a payment milestone is attempted without a verified trust_evidence acknowledgment."""


class CeilingBreach(Exception):
    """Raised when an action would push cumulative spend past the contract's ceiling threshold."""


class LegalAgentNotConfigured(Exception):
    """Raised when the legal-agent chatbot is queried without an embedding/LLM provider API key set."""
