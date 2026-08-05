class InvalidTransition(Exception):
    """Raised when a decision's current status doesn't allow the requested edge action."""


class NotAuthorized(Exception):
    """Raised when the acting user doesn't hold the RACI role required for this action."""
