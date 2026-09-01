"""Automated verification tests for T08 Pydantic Schemas & ORM Serialization."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models import Project, MP, District, RiskScore, RiskFlag
from backend.app.schemas import (
    ProjectItemSchema,
    AllocationDetailSchema,
    RiskAssessmentSchema,
    ReasonCardSchema,
    OverviewStatsSchema,
    PaginationEnvelope
)
from backend.app.database import DATABASE_URL


@pytest.fixture(scope="module")
def db():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_project_item_schema_serialization(db):
    project = db.query(Project).first()
    assert project is not None, "At least one project must exist in DB"

    schema = ProjectItemSchema.model_validate(project)
    assert schema.source_record_id == project.source_record_id
    assert schema.sanctioned_cost == project.sanctioned_cost
    assert schema.expenditure == project.expenditure
    assert schema.financial_utilization >= 0.0


def test_allocation_detail_schema(db):
    project = db.query(Project).first()
    financial_util = round((project.expenditure / project.sanctioned_cost * 100), 2) if project.sanctioned_cost > 0 else 0.0

    schema = AllocationDetailSchema(
        id=project.id,
        source_record_id=project.source_record_id,
        mp_name=project.mp_name,
        house=project.house,
        lok_sabha_term=project.lok_sabha_term,
        state=project.state,
        district=project.district,
        constituency=project.constituency,
        category=project.category,
        description=project.description,
        sanction_date=project.sanction_date,
        completion_date=project.completion_date,
        sanctioned_cost=project.sanctioned_cost,
        expenditure=project.expenditure,
        entitlement=project.entitlement,
        released_amount=project.released_amount,
        unspent_balance=project.unspent_balance,
        financial_utilization=financial_util,
        status=project.status,
        pending_reason=project.pending_reason
    )
    assert schema.source_record_id == project.source_record_id
    assert schema.financial_utilization == financial_util


def test_pagination_envelope():
    envelope = PaginationEnvelope[int](
        items=[1, 2, 3],
        total=100,
        page=1,
        limit=3,
        total_pages=34
    )
    assert len(envelope.items) == 3
    assert envelope.total == 100
