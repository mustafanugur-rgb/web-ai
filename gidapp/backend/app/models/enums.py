from enum import StrEnum


class UserRole(StrEnum):
    CUSTOMER = "CUSTOMER"
    RESTAURANT = "RESTAURANT"
    ADMIN = "ADMIN"


class BillStatus(StrEnum):
    OPEN = "OPEN"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    USER_MARKED = "USER_MARKED"
    CONFIRMED = "CONFIRMED"
