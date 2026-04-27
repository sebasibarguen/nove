"""add_training_tables

Revision ID: a3f1c8e92d01
Revises: f610e00b83f1
Create Date: 2026-03-24 10:00:00.000000

Idempotent: an earlier deploy partially applied this migration on prod
without bumping alembic_version. We skip CREATE/INDEX ops for objects
that already exist so re-runs are a no-op.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a3f1c8e92d01'
down_revision: Union[str, None] = 'f610e00b83f1'
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
    if not _has_table("fitness_profiles"):
        op.create_table(
            "fitness_profiles",
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("experience_level", sa.String(length=16), nullable=True),
            sa.Column("training_days_per_week", sa.Integer(), nullable=True),
            sa.Column("session_duration_minutes", sa.Integer(), nullable=True),
            sa.Column("available_equipment", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("training_goals", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("injuries_limitations", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("preferred_time", sa.String(length=16), nullable=True),
            sa.Column("cardio_preference", sa.String(length=16), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id"),
        )

    if not _has_table("training_plans"):
        op.create_table(
            "training_plans",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("name", sa.String(length=256), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("plan_type", sa.String(length=16), nullable=False),
            sa.Column("duration_weeks", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False),
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
        )
    if not _has_index("training_plans", "ix_training_plans_user_id"):
        op.create_index(op.f("ix_training_plans_user_id"), "training_plans", ["user_id"], unique=False)

    if not _has_table("workouts"):
        op.create_table(
            "workouts",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("plan_id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("week_number", sa.Integer(), nullable=False),
            sa.Column("day_of_week", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=256), nullable=False),
            sa.Column("workout_type", sa.String(length=16), nullable=False),
            sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("order_index", sa.Integer(), nullable=False),
            sa.Column("calendar_event_id", sa.String(length=256), nullable=True),
            sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["plan_id"], ["training_plans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("workouts", "ix_workouts_plan_id"):
        op.create_index(op.f("ix_workouts_plan_id"), "workouts", ["plan_id"], unique=False)
    if not _has_index("workouts", "ix_workouts_user_id"):
        op.create_index(op.f("ix_workouts_user_id"), "workouts", ["user_id"], unique=False)

    if not _has_table("workout_logs"):
        op.create_table(
            "workout_logs",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("workout_id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("perceived_effort", sa.Integer(), nullable=False),
            sa.Column("completed_fully", sa.Boolean(), nullable=False),
            sa.Column("mood", sa.String(length=8), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["workout_id"], ["workouts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("workout_logs", "ix_workout_logs_workout_id"):
        op.create_index(op.f("ix_workout_logs_workout_id"), "workout_logs", ["workout_id"], unique=False)
    if not _has_index("workout_logs", "ix_workout_logs_user_id"):
        op.create_index(op.f("ix_workout_logs_user_id"), "workout_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_workout_logs_user_id"), table_name="workout_logs")
    op.drop_index(op.f("ix_workout_logs_workout_id"), table_name="workout_logs")
    op.drop_table("workout_logs")
    op.drop_index(op.f("ix_workouts_user_id"), table_name="workouts")
    op.drop_index(op.f("ix_workouts_plan_id"), table_name="workouts")
    op.drop_table("workouts")
    op.drop_index(op.f("ix_training_plans_user_id"), table_name="training_plans")
    op.drop_table("training_plans")
    op.drop_table("fitness_profiles")
