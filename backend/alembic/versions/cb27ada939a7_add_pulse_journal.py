"""add pulse journal

Revision ID: cb27ada939a7
Revises: a3f1c8e92d01
Create Date: 2026-04-21 13:15:32.627454

Idempotent — see a3f1c8e92d01 for context.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'cb27ada939a7'
down_revision: Union[str, None] = 'a3f1c8e92d01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def _has_index(table: str, name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table):
        return False
    return any(ix["name"] == name for ix in inspector.get_indexes(table))


def upgrade() -> None:
    if not _has_table("pulse_journal_entries"):
        op.create_table(
            "pulse_journal_entries",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("responses", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "date", name="uq_pulse_journal_user_date"),
        )
    if not _has_index("pulse_journal_entries", "ix_pulse_journal_entries_user_id"):
        op.create_index(
            op.f("ix_pulse_journal_entries_user_id"),
            "pulse_journal_entries",
            ["user_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_pulse_journal_entries_user_id"), table_name="pulse_journal_entries")
    op.drop_table("pulse_journal_entries")
