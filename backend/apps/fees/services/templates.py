from decimal import Decimal, InvalidOperation


def fee_payment_received(
    parent_name:    str,
    student_name:   str,
    student_class:  str,
    amount_paid:    Decimal,
    balance:        Decimal,
    term:           str,
    transaction_id: int,
) -> str:
    try:
        amount_paid = Decimal(str(amount_paid))
        balance     = Decimal(str(balance))
    except (InvalidOperation, TypeError):
        amount_paid = Decimal("0")
        balance     = Decimal("0")

    balance_line = (
        f"Balance: GHS {balance:.2f}."
        if balance > 0
        else "Account fully settled."
    )
    return (
        f"Dear {parent_name}, GHS {amount_paid:.2f} received for "
        f"{student_name} ({student_class}), {term}. "
        f"{balance_line} Ref: TXN-{transaction_id}. Thank you."
    )
