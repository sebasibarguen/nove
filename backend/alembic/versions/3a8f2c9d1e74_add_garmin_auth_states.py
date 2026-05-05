"""add garmin_auth_states for PKCE verifier persistence

Revision ID: 3a8f2c9d1e74
Revises: cb27ada939a7
Create Date: 2026-05-05 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "3a8f2c9d1e74"
down_revision: Union[str, None] = "cb27ada939a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def upgrade() -> None:
    if not _has_table("garmin_auth_states"):
        op.create_table(
            "garmin_auth_states",
            sa.Column("state", sa.String(128), primary_key=True),
            sa.Column("code_verifier", sa.Text(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("garmin_auth_states")
