"""initial_schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-09-18 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. employees_master
    op.create_table(
        'employees_master',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nik', sa.String(length=50), nullable=False),
        sa.Column('nik_sap', sa.String(length=50), nullable=True),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('eselon', sa.String(length=50), nullable=True),
        sa.Column('nm_jabatan', sa.String(length=255), nullable=True),
        sa.Column('direktorat', sa.String(length=255), nullable=True),
        sa.Column('kompartemen', sa.String(length=255), nullable=True),
        sa.Column('departemen', sa.String(length=255), nullable=True),
        sa.Column('bagian', sa.String(length=255), nullable=True),
        sa.Column('seksi', sa.String(length=255), nullable=True),
        sa.Column('regu', sa.String(length=255), nullable=True),
        sa.Column('status_pegawai', sa.String(length=50), nullable=True),
        sa.Column('status_kerja', sa.String(length=50), nullable=True),
        sa.Column('kategori', sa.String(length=50), nullable=False, server_default='AKTIF'),
        sa.Column('is_delegasi', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('delegasi_posisi_lain', sa.Text(), nullable=True),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_employees_master_nik', 'employees_master', ['nik'], unique=False)
    op.create_index('ix_employees_master_nik_sap', 'employees_master', ['nik_sap'], unique=False)
    op.create_index('ix_employees_master_nama', 'employees_master', ['nama'], unique=False)
    op.create_index('ix_employees_master_kategori', 'employees_master', ['kategori'], unique=False)
    op.create_index('ix_emp_nik_snapshot', 'employees_master', ['nik', 'snapshot_date'], unique=False)

    # 2. org_unit_aliases
    op.create_table(
        'org_unit_aliases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nama_asli', sa.String(length=255), nullable=False),
        sa.Column('nama_kanonik', sa.String(length=255), nullable=False),
        sa.Column('jenis', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nama_asli')
    )
    op.create_index('ix_org_unit_aliases_nama_asli', 'org_unit_aliases', ['nama_asli'], unique=True)
    op.create_index('ix_org_unit_aliases_nama_kanonik', 'org_unit_aliases', ['nama_kanonik'], unique=False)

    # 3. periods
    op.create_table(
        'periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tahun', sa.Integer(), nullable=False),
        sa.Column('triwulan', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tahun', 'triwulan', name='uq_period_tahun_triwulan')
    )
    op.create_index('ix_periods_tahun', 'periods', ['tahun'], unique=False)

    # 4. uploads
    op.create_table(
        'uploads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jenis_file', sa.String(length=50), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('uploaded_by', sa.String(length=100), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('orphan_row_count', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. upload_orphan_rows
    op.create_table(
        'upload_orphan_rows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('upload_id', sa.Integer(), nullable=False),
        sa.Column('row_number', sa.Integer(), nullable=True),
        sa.Column('nik', sa.String(length=50), nullable=True),
        sa.Column('nama', sa.String(length=255), nullable=True),
        sa.Column('departemen', sa.String(length=255), nullable=True),
        sa.Column('raw_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['upload_id'], ['uploads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. performance_planning
    op.create_table(
        'performance_planning',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=False),
        sa.Column('employee_nik', sa.String(length=50), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('departemen', sa.String(length=255), nullable=True),
        sa.Column('grade', sa.String(length=50), nullable=True),
        sa.Column('status_individu', sa.String(length=50), nullable=False),
        sa.Column('status_unit', sa.String(length=50), nullable=True),
        sa.Column('submitted_date', sa.String(length=50), nullable=True),
        sa.Column('approved_date', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_performance_planning_period_id', 'performance_planning', ['period_id'], unique=False)
    op.create_index('ix_performance_planning_employee_nik', 'performance_planning', ['employee_nik'], unique=False)

    # 7. performance_coaching
    op.create_table(
        'performance_coaching',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=False),
        sa.Column('employee_nik', sa.String(length=50), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('departemen', sa.String(length=255), nullable=True),
        sa.Column('superior_nik', sa.String(length=50), nullable=True),
        sa.Column('superior_nama', sa.String(length=255), nullable=True),
        sa.Column('superior_posisi', sa.String(length=255), nullable=True),
        sa.Column('jumlah_coaching', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('tanggal_coaching', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_performance_coaching_period_id', 'performance_coaching', ['period_id'], unique=False)
    op.create_index('ix_performance_coaching_employee_nik', 'performance_coaching', ['employee_nik'], unique=False)

    # 8. performance_appraisal
    op.create_table(
        'performance_appraisal',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=False),
        sa.Column('employee_nik', sa.String(length=50), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('departemen', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('submitted_date', sa.String(length=50), nullable=True),
        sa.Column('approved_date', sa.String(length=50), nullable=True),
        sa.Column('total_score', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_performance_appraisal_period_id', 'performance_appraisal', ['period_id'], unique=False)
    op.create_index('ix_performance_appraisal_employee_nik', 'performance_appraisal', ['employee_nik'], unique=False)

    # 9. performance_review360
    op.create_table(
        'performance_review360',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.Integer(), nullable=False),
        sa.Column('employee_nik', sa.String(length=50), nullable=False),
        sa.Column('nama', sa.String(length=255), nullable=False),
        sa.Column('departemen', sa.String(length=255), nullable=True),
        sa.Column('atasan_assessed', sa.String(length=20), nullable=True),
        sa.Column('rekan_assessed', sa.String(length=20), nullable=True),
        sa.Column('bawahan_assessed', sa.String(length=20), nullable=True),
        sa.Column('pribadi_assessed', sa.String(length=20), nullable=True),
        sa.Column('total_assessed', sa.String(length=20), nullable=True),
        sa.Column('total_pct', sa.Numeric(precision=6, scale=2), nullable=True, server_default='0.0'),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_performance_review360_period_id', 'performance_review360', ['period_id'], unique=False)
    op.create_index('ix_performance_review360_employee_nik', 'performance_review360', ['employee_nik'], unique=False)


def downgrade() -> None:
    op.drop_table('performance_review360')
    op.drop_table('performance_appraisal')
    op.drop_table('performance_coaching')
    op.drop_table('performance_planning')
    op.drop_table('upload_orphan_rows')
    op.drop_table('uploads')
    op.drop_table('periods')
    op.drop_table('org_unit_aliases')
    op.drop_table('employees_master')
