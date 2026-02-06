# ABOUTME: SQLAlchemy models for lab panels, partners, orders, results, and biomarker values.
# ABOUTME: Core schema for the lab ordering and PDF processing pipeline.

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from nove.database import Base

ORDER_STATUSES = (
    "pending",
    "sent_to_lab",
    "sample_collected",
    "processing",
    "completed",
    "cancelled",
)
PROCESSING_STATUSES = (
    "pending",
    "processing",
    "extracted",
    "review_needed",
    "verified",
    "failed",
)
BIOMARKER_STATUSES = ("normal", "borderline", "flagged")


class LabPanel(Base):
    __tablename__ = "lab_panels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text)
    biomarkers: Mapped[dict] = mapped_column(JSONB)
    price_cents: Mapped[int] = mapped_column(Integer)
    tier_included: Mapped[str | None] = mapped_column(String(32))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LabPartner(Base):
    __tablename__ = "lab_partners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(256))
    code_prefix: Mapped[str] = mapped_column(String(8), unique=True)
    email_address: Mapped[str | None] = mapped_column(String(320))
    password_hash: Mapped[str | None] = mapped_column(String(128))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LabOrder(Base):
    __tablename__ = "lab_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    panel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lab_panels.id"))
    order_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(
        Enum(*ORDER_STATUSES, name="order_status"), default="pending"
    )
    lab_partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_partners.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    panel: Mapped[LabPanel] = relationship()
    results: Mapped[list["LabResult"]] = relationship(back_populates="order")


class LabResult(Base):
    __tablename__ = "lab_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_orders.id"), nullable=True
    )
    pdf_storage_key: Mapped[str | None] = mapped_column(String(512))
    processing_status: Mapped[str] = mapped_column(
        Enum(*PROCESSING_STATUSES, name="processing_status"), default="pending"
    )
    ai_summary: Mapped[str | None] = mapped_column(Text)
    confidence_score: Mapped[float | None] = mapped_column(Float)
    reviewed_by: Mapped[str | None] = mapped_column(String(256))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    order: Mapped[LabOrder | None] = relationship(back_populates="results")
    biomarker_values: Mapped[list["LabBiomarkerValue"]] = relationship(back_populates="result")


class LabBiomarkerValue(Base):
    __tablename__ = "lab_biomarker_values"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_results.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    biomarker_code: Mapped[str] = mapped_column(String(64))
    biomarker_name: Mapped[str] = mapped_column(String(256))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(32))
    reference_range_low: Mapped[float | None] = mapped_column(Float)
    reference_range_high: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(
        Enum(*BIOMARKER_STATUSES, name="biomarker_status"), default="normal"
    )
    confidence: Mapped[float | None] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date)

    result: Mapped[LabResult] = relationship(back_populates="biomarker_values")

    __table_args__ = (Index("ix_biomarker_user_code_date", "user_id", "biomarker_code", "date"),)
