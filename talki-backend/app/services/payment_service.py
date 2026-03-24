from datetime import timedelta

PLAN_PRICES = {
    "monthly": 99000,
    "yearly": 999000
}

PLAN_DURATIONS = {
    "monthly": timedelta(days=30),
    "yearly": timedelta(days=365)
}

def validate_plan(plan: str) -> str:
    """Validate subscription plan name used by payment flows."""
    if plan not in PLAN_PRICES:
        raise ValueError(f"Invalid plan: {plan}")
    return plan
