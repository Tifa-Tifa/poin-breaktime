-- Optimasi startup Poin Breaktime
-- Bulan pertama yang memiliki catatan poin menjadi bulan mulai karyawan.
-- Kapten/karyawan tanpa riwayat poin tetap NULL.

begin;

alter table public.employees
  add column if not exists employment_start_date date;

with first_point_month as (
  select
    employee_id,
    date_trunc('month', min(entry_date))::date as employment_start_date
  from public.point_entries
  where status <> 'VOID'
  group by employee_id
)
update public.employees as employee
set employment_start_date = first_point_month.employment_start_date
from first_point_month
where employee.id = first_point_month.employee_id
  and employee.employment_start_date is distinct from first_point_month.employment_start_date;

commit;

-- Verifikasi hasil. Seharusnya 73 karyawan terisi berdasarkan pemeriksaan awal.
select
  count(*) filter (where employment_start_date is not null) as sudah_terisi,
  count(*) filter (where employment_start_date is null) as belum_terisi
from public.employees;
