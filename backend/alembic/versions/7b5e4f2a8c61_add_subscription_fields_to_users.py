"""add subscription fields to users for Pulse paywall

Revision ID: 7b5e4f2a8c61
Revises: 3a8f2c9d1e74
Create Date: 2026-05-05 10:05:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "7b5e4f2a8c61"
down_revision: Union[str, None] = "3a8f2c9d1e74"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(c["name"] == column for c in inspector.get_columns(table))


def _has_index(table: str, name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table):
        return False
    return any(ix["name"] == name for ix in inspector.get_indexes(table))


def upgrade() -> None:
    if not _has_column("users", "stripe_customer_id"):
        op.add_column("users", sa.Column("stripe_customer_id", sa.String(64), nullable=True))
    if not _has_index("users", "ix_users_stripe_customer_id"):
        op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)

    if not _has_column("users", "stripe_subscription_id"):
        op.add_column("users", sa.Column("stripe_subscription_id", sa.String(64), nullable=True))
    if not _has_index("users", "ix_users_stripe_subscription_id"):
        op.create_index("ix_users_stripe_subscription_id", "users", ["stripe_subscription_id"], unique=True)

    if not _has_column("users", "subscription_status"):
        op.add_column("users", sa.Column("subscription_status", sa.String(32), nullable=True))

    if not _has_column("users", "trial_ends_at"):
        op.add_column("users", sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_index("ix_users_stripe_subscription_id", table_name="users")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "trial_ends_at")
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
