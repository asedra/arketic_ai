"""Remove employee_id and make organization_id nullable

Revision ID: 004_remove_employee_id
Revises: 460f43e1b2ac
Create Date: 2025-08-07 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from core.types import UUID


# revision identifiers, used by Alembic.
revision = '004_remove_employee_id'
down_revision = '460f43e1b2ac'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove employee_id column and its unique constraint.
    Make organization_id nullable to fix 409 conflict issues.
    """
    # Drop the unique constraint on employee_id first
    op.drop_constraint('people_employee_id_key', 'people', type_='unique')
    
    # Drop the employee_id column
    op.drop_column('people', 'employee_id')
    
    # Ensure organization_id is nullable (it might already be)
    op.alter_column('people', 'organization_id',
                    existing_type=UUID(as_uuid=True),
                    nullable=True)


def downgrade() -> None:
    """
    Re-add employee_id column and make organization_id not nullable.
    """
    # Add employee_id column back
    op.add_column('people', sa.Column('employee_id', sa.String(length=50), nullable=True))
    
    # Add unique constraint back on employee_id
    op.create_unique_constraint('people_employee_id_key', 'people', ['employee_id'])
    
    # Make organization_id not nullable again (this might fail if there are null values)
    op.alter_column('people', 'organization_id',
                    existing_type=UUID(as_uuid=True),
                    nullable=False)