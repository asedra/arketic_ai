"""People management table

Revision ID: 003
Revises: 002
Create Date: 2025-08-07 23:32:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create people table
    op.create_table('people',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('job_title', sa.String(200), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('site', sa.String(200), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'USER', 'MANAGER', 'VIEWER', name='personrole'), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'PENDING', name='personstatus'), nullable=False),
        sa.Column('hire_date', sa.DateTime(), nullable=True),
        sa.Column('manager_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('people.id', ondelete='SET NULL'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for people table
    op.create_index('idx_person_email', 'people', ['email'])
    op.create_index('idx_person_department', 'people', ['department'])
    op.create_index('idx_person_status', 'people', ['status'])
    op.create_index('idx_person_manager', 'people', ['manager_id'])


def downgrade() -> None:
    # Drop table
    op.drop_table('people')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS personstatus')
    op.execute('DROP TYPE IF EXISTS personrole')