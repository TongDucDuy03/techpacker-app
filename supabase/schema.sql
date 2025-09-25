-- Techpacker PostgreSQL schema (for Supabase) - Comprehensive Data Architecture

-- Core TechPack table with normalized structure
create table if not exists public.techpacks (
  id text primary key,
  name text not null,
  category text not null,
  status text not null check (status in ('draft','review','approved','production')),
  date_created timestamptz not null default now(),
  last_modified timestamptz not null default now(),
  season text not null,
  brand text not null,
  designer text not null,
  images jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  version text not null default '1.0.0',
  parent_id text references public.techpacks(id),
  is_active boolean not null default true,
  created_by text not null,
  updated_by text not null
);

-- Materials Library - Normalized structure
create table if not exists public.materials (
  id text primary key,
  name text not null,
  composition text not null,
  supplier text not null,
  color text not null,
  consumption text not null,
  specifications text,
  position text,
  quantity numeric,
  unit text,
  technical_notes text,
  sub_materials jsonb not null default '[]'::jsonb,
  cost numeric,
  lead_time integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  is_active boolean not null default true
);

-- BOM Items - Detailed bill of materials
create table if not exists public.bom_items (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  part text not null check (part in ('Fabric', 'Trims', 'Labels', 'Packaging')),
  material_code text not null,
  placement text not null check (placement in ('Collar', 'Placket', 'Pocket', 'Sleeve', 'Body', 'Cuff', 'Hem', 'Seam', 'Buttonhole', 'Zipper', 'Other')),
  size_spec text not null,
  quantity numeric not null,
  uom text not null check (uom in ('Yards', 'Meters', 'Pieces', 'Dozen', 'Rolls', 'Sheets', 'Feet', 'Inches', 'Grams', 'Kilograms')),
  supplier text not null,
  comments text[] not null default '{}',
  images text[] not null default '{}',
  color text,
  weight numeric,
  cost numeric,
  lead_time integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Suppliers
create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  contact text not null,
  email text not null,
  phone text not null,
  address text not null,
  specialties text[] not null default '{}',
  rating numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- POM (Point of Measurement) System
create table if not exists public.pom_codes (
  code text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('Body', 'Sleeve', 'Collar', 'Pocket', 'Other')),
  unit text not null check (unit in ('inches', 'cm')),
  how_to_measure text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pom_specifications (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  pom_code text not null references public.pom_codes(code),
  pom_name text not null,
  tolerances jsonb not null, -- {minusTol: number, plusTol: number, unit: string}
  measurements jsonb not null, -- {size: measurement_value}
  how_to_measure text not null,
  category text not null,
  unit text not null check (unit in ('inches', 'cm')),
  grade_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Size Charts and Grading
create table if not exists public.size_charts (
  id text primary key,
  name text not null,
  size_range text not null check (size_range in ('XXS-XLT', '2XL-8XLT', 'Regular/Tall')),
  sizes text[] not null,
  variations text[] not null check (variations <@ ARRAY['Regular', 'Tall', 'Short']),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grading_rules (
  id text primary key,
  name text not null,
  base_size text not null,
  size_ranges text[] not null,
  fit_type text not null check (fit_type in ('Regular', 'Tall', 'Big & Tall', 'Petite', 'Plus')),
  increments jsonb not null,
  region text not null check (region in ('US', 'EU', 'UK', 'JP', 'AU')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Construction Details
create table if not exists public.construction_details (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  category text not null check (category in ('Seams', 'Pockets', 'Collar', 'Sleeves', 'Closures', 'Hems', 'Pleats', 'Darts', 'Other')),
  name text not null,
  description text not null,
  specifications jsonb not null default '[]'::jsonb,
  sequence integer not null,
  quality_checkpoints text[] not null default '{}',
  special_instructions text[] not null default '{}',
  materials text[] not null default '{}',
  tools text[] not null default '{}',
  estimated_time integer not null, -- in minutes
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard', 'Expert')),
  diagram text,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  tags text[] not null default '{}'
);

-- Care Instructions and Compliance
create table if not exists public.care_symbols (
  id text primary key,
  name text not null,
  type text not null check (type in ('wash', 'dry', 'iron', 'bleach', 'dryclean', 'warning', 'temperature', 'special')),
  standard text not null check (standard in ('ISO', 'ASTM', 'GINETEX', 'JIS', 'AS', 'Custom')),
  svg text not null,
  description text not null,
  temperature jsonb, -- {min: number, max: number, unit: string}
  warnings text[] not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_instructions (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  language text not null check (language in ('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar')),
  symbols text[] not null default '{}', -- references to care_symbols
  text_instructions text[] not null default '{}',
  special_instructions text[] not null default '{}',
  warnings text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Version Control and Refit Management
create table if not exists public.techpack_versions (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  version text not null,
  status text not null check (status in ('Draft', 'Review', 'Approved', 'Active', 'Rejected', 'Archived')),
  changes jsonb not null default '[]'::jsonb,
  approvals jsonb not null default '[]'::jsonb,
  notes text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  parent_version_id text references public.techpack_versions(id),
  is_active boolean not null default false,
  refit_request_id text
);

create table if not exists public.refit_requests (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  version_id text not null references public.techpack_versions(id),
  reason text not null check (reason in ('Fit Issue', 'Measurement Error', 'Material Change', 'Construction Update', 'Customer Request', 'Quality Issue', 'Other')),
  description text not null,
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Critical')),
  requested_by text not null,
  requested_at timestamptz not null default now(),
  status text not null check (status in ('Open', 'In Progress', 'Completed', 'Cancelled')),
  before_measurements jsonb not null,
  after_measurements jsonb not null,
  impact_analysis text,
  implementation_notes text,
  completed_at timestamptz,
  completed_by text
);

-- Export and PDF Generation
create table if not exists public.export_templates (
  id text primary key,
  name text not null,
  type text not null check (type in ('full-techpack', 'summary-techpack', 'bom-only', 'measurements-only', 'construction-only', 'care-instructions', 'custom')),
  description text not null,
  pages jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  branding jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null
);

create table if not exists public.export_jobs (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  template_id text not null references public.export_templates(id),
  format text not null check (format in ('PDF', 'DOCX', 'XLSX', 'HTML', 'JSON')),
  status text not null check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0,
  file_name text not null,
  file_size bigint,
  download_url text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by text not null,
  settings jsonb not null default '{}'::jsonb
);

-- Activities and Audit Trail
create table if not exists public.activities (
  id text primary key,
  action text not null,
  item text not null,
  time text not null,
  user_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_trail (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  version_id text references public.techpack_versions(id),
  action text not null,
  user_id text not null,
  user_name text not null,
  timestamp timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text
);

-- Users and Permissions
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null,
  permissions text[] not null default '{}',
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Colorways
create table if not exists public.colorways (
  id text primary key,
  techpack_id text not null references public.techpacks(id) on delete cascade,
  name text not null,
  colors jsonb not null default '[]'::jsonb, -- [{part: string, color: string, pantone?: string}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for Performance Optimization
create index if not exists idx_techpacks_status on public.techpacks(status);
create index if not exists idx_techpacks_created_by on public.techpacks(created_by);
create index if not exists idx_techpacks_last_modified on public.techpacks(last_modified);
create index if not exists idx_techpacks_brand_season on public.techpacks(brand, season);

create index if not exists idx_bom_items_techpack_id on public.bom_items(techpack_id);
create index if not exists idx_bom_items_part on public.bom_items(part);
create index if not exists idx_bom_items_supplier on public.bom_items(supplier);

create index if not exists idx_pom_specifications_techpack_id on public.pom_specifications(techpack_id);
create index if not exists idx_pom_specifications_pom_code on public.pom_specifications(pom_code);

create index if not exists idx_construction_details_techpack_id on public.construction_details(techpack_id);
create index if not exists idx_construction_details_category on public.construction_details(category);

create index if not exists idx_care_instructions_techpack_id on public.care_instructions(techpack_id);
create index if not exists idx_care_instructions_language on public.care_instructions(language);

create index if not exists idx_techpack_versions_techpack_id on public.techpack_versions(techpack_id);
create index if not exists idx_techpack_versions_status on public.techpack_versions(status);
create index if not exists idx_techpack_versions_is_active on public.techpack_versions(is_active);

create index if not exists idx_refit_requests_techpack_id on public.refit_requests(techpack_id);
create index if not exists idx_refit_requests_status on public.refit_requests(status);
create index if not exists idx_refit_requests_priority on public.refit_requests(priority);

create index if not exists idx_export_jobs_techpack_id on public.export_jobs(techpack_id);
create index if not exists idx_export_jobs_status on public.export_jobs(status);
create index if not exists idx_export_jobs_created_by on public.export_jobs(created_by);

create index if not exists idx_audit_trail_techpack_id on public.audit_trail(techpack_id);
create index if not exists idx_audit_trail_timestamp on public.audit_trail(timestamp);
create index if not exists idx_audit_trail_user_id on public.audit_trail(user_id);

-- Triggers for Automatic Updates
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers to relevant tables
create trigger update_techpacks_updated_at before update on public.techpacks for each row execute function update_updated_at_column();
create trigger update_materials_updated_at before update on public.materials for each row execute function update_updated_at_column();
create trigger update_bom_items_updated_at before update on public.bom_items for each row execute function update_updated_at_column();
create trigger update_suppliers_updated_at before update on public.suppliers for each row execute function update_updated_at_column();
create trigger update_pom_codes_updated_at before update on public.pom_codes for each row execute function update_updated_at_column();
create trigger update_pom_specifications_updated_at before update on public.pom_specifications for each row execute function update_updated_at_column();
create trigger update_size_charts_updated_at before update on public.size_charts for each row execute function update_updated_at_column();
create trigger update_grading_rules_updated_at before update on public.grading_rules for each row execute function update_updated_at_column();
create trigger update_construction_details_updated_at before update on public.construction_details for each row execute function update_updated_at_column();
create trigger update_care_symbols_updated_at before update on public.care_symbols for each row execute function update_updated_at_column();
create trigger update_care_instructions_updated_at before update on public.care_instructions for each row execute function update_updated_at_column();
create trigger update_techpack_versions_updated_at before update on public.techpack_versions for each row execute function update_updated_at_column();
create trigger update_export_templates_updated_at before update on public.export_templates for each row execute function update_updated_at_column();
create trigger update_users_updated_at before update on public.users for each row execute function update_updated_at_column();
create trigger update_colorways_updated_at before update on public.colorways for each row execute function update_updated_at_column();

-- Function to create audit trail entry
create or replace function create_audit_trail()
returns trigger as $$
begin
  insert into public.audit_trail (
    id,
    techpack_id,
    action,
    user_id,
    user_name,
    details
  ) values (
    'audit_' || extract(epoch from now())::text || '_' || random()::text,
    coalesce(new.techpack_id, old.techpack_id),
    case 
      when tg_op = 'INSERT' then 'CREATE'
      when tg_op = 'UPDATE' then 'UPDATE'
      when tg_op = 'DELETE' then 'DELETE'
    end,
    coalesce(new.created_by, new.updated_by, old.created_by, old.updated_by, 'system'),
    coalesce(new.created_by, new.updated_by, old.created_by, old.updated_by, 'system'),
    jsonb_build_object(
      'table', tg_table_name,
      'operation', tg_op,
      'old_data', case when tg_op = 'DELETE' then to_jsonb(old) else null end,
      'new_data', case when tg_op = 'INSERT' or tg_op = 'UPDATE' then to_jsonb(new) else null end
    )
  );
  return coalesce(new, old);
end;
$$ language plpgsql;

-- Apply audit trail triggers
create trigger audit_techpacks after insert or update or delete on public.techpacks for each row execute function create_audit_trail();
create trigger audit_bom_items after insert or update or delete on public.bom_items for each row execute function create_audit_trail();
create trigger audit_pom_specifications after insert or update or delete on public.pom_specifications for each row execute function create_audit_trail();
create trigger audit_construction_details after insert or update or delete on public.construction_details for each row execute function create_audit_trail();
create trigger audit_care_instructions after insert or update or delete on public.care_instructions for each row execute function create_audit_trail();
create trigger audit_techpack_versions after insert or update or delete on public.techpack_versions for each row execute function create_audit_trail();
create trigger audit_refit_requests after insert or update or delete on public.refit_requests for each row execute function create_audit_trail();

-- Supabase Row Level Security (RLS)
alter table public.techpacks enable row level security;
alter table public.activities enable row level security;
alter table public.materials enable row level security;
alter table public.bom_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.pom_codes enable row level security;
alter table public.pom_specifications enable row level security;
alter table public.size_charts enable row level security;
alter table public.grading_rules enable row level security;
alter table public.construction_details enable row level security;
alter table public.care_symbols enable row level security;
alter table public.care_instructions enable row level security;
alter table public.techpack_versions enable row level security;
alter table public.refit_requests enable row level security;
alter table public.export_templates enable row level security;
alter table public.export_jobs enable row level security;
alter table public.audit_trail enable row level security;
alter table public.users enable row level security;
alter table public.colorways enable row level security;

-- RLS Policies (adjust for your auth model)
-- For now, using open policies - replace with proper auth-based policies

-- TechPacks policies
create policy "Allow read techpacks" on public.techpacks for select using (true);
create policy "Allow insert techpacks" on public.techpacks for insert with check (true);
create policy "Allow update techpacks" on public.techpacks for update using (true);
create policy "Allow delete techpacks" on public.techpacks for delete using (true);

-- Activities policies
create policy "Allow read activities" on public.activities for select using (true);
create policy "Allow insert activities" on public.activities for insert with check (true);

-- Materials policies
create policy "Allow read materials" on public.materials for select using (true);
create policy "Allow insert materials" on public.materials for insert with check (true);
create policy "Allow update materials" on public.materials for update using (true);
create policy "Allow delete materials" on public.materials for delete using (true);

-- BOM Items policies
create policy "Allow read bom_items" on public.bom_items for select using (true);
create policy "Allow insert bom_items" on public.bom_items for insert with check (true);
create policy "Allow update bom_items" on public.bom_items for update using (true);
create policy "Allow delete bom_items" on public.bom_items for delete using (true);

-- POM Specifications policies
create policy "Allow read pom_specifications" on public.pom_specifications for select using (true);
create policy "Allow insert pom_specifications" on public.pom_specifications for insert with check (true);
create policy "Allow update pom_specifications" on public.pom_specifications for update using (true);
create policy "Allow delete pom_specifications" on public.pom_specifications for delete using (true);

-- Construction Details policies
create policy "Allow read construction_details" on public.construction_details for select using (true);
create policy "Allow insert construction_details" on public.construction_details for insert with check (true);
create policy "Allow update construction_details" on public.construction_details for update using (true);
create policy "Allow delete construction_details" on public.construction_details for delete using (true);

-- Care Instructions policies
create policy "Allow read care_instructions" on public.care_instructions for select using (true);
create policy "Allow insert care_instructions" on public.care_instructions for insert with check (true);
create policy "Allow update care_instructions" on public.care_instructions for update using (true);
create policy "Allow delete care_instructions" on public.care_instructions for delete using (true);

-- Version Control policies
create policy "Allow read techpack_versions" on public.techpack_versions for select using (true);
create policy "Allow insert techpack_versions" on public.techpack_versions for insert with check (true);
create policy "Allow update techpack_versions" on public.techpack_versions for update using (true);

-- Refit Requests policies
create policy "Allow read refit_requests" on public.refit_requests for select using (true);
create policy "Allow insert refit_requests" on public.refit_requests for insert with check (true);
create policy "Allow update refit_requests" on public.refit_requests for update using (true);

-- Export policies
create policy "Allow read export_templates" on public.export_templates for select using (true);
create policy "Allow insert export_templates" on public.export_templates for insert with check (true);
create policy "Allow update export_templates" on public.export_templates for update using (true);

create policy "Allow read export_jobs" on public.export_jobs for select using (true);
create policy "Allow insert export_jobs" on public.export_jobs for insert with check (true);
create policy "Allow update export_jobs" on public.export_jobs for update using (true);

-- Audit Trail policies (read-only for most users)
create policy "Allow read audit_trail" on public.audit_trail for select using (true);

-- Users policies
create policy "Allow read users" on public.users for select using (true);
create policy "Allow insert users" on public.users for insert with check (true);
create policy "Allow update users" on public.users for update using (true);

-- Colorways policies
create policy "Allow read colorways" on public.colorways for select using (true);
create policy "Allow insert colorways" on public.colorways for insert with check (true);
create policy "Allow update colorways" on public.colorways for update using (true);
create policy "Allow delete colorways" on public.colorways for delete using (true);

-- Views for Complex Queries
create or replace view techpack_summary as
select 
  t.id,
  t.name,
  t.category,
  t.status,
  t.date_created,
  t.last_modified,
  t.season,
  t.brand,
  t.designer,
  t.version,
  t.is_active,
  count(distinct bi.id) as bom_item_count,
  count(distinct ps.id) as measurement_count,
  count(distinct cd.id) as construction_detail_count,
  count(distinct ci.id) as care_instruction_count,
  count(distinct tv.id) as version_count
from public.techpacks t
left join public.bom_items bi on t.id = bi.techpack_id
left join public.pom_specifications ps on t.id = ps.techpack_id
left join public.construction_details cd on t.id = cd.techpack_id
left join public.care_instructions ci on t.id = ci.techpack_id
left join public.techpack_versions tv on t.id = tv.techpack_id
group by t.id, t.name, t.category, t.status, t.date_created, t.last_modified, t.season, t.brand, t.designer, t.version, t.is_active;

-- Functions for Data Validation
create or replace function validate_techpack_data(techpack_data jsonb)
returns boolean as $$
begin
  -- Validate required fields
  if not (techpack_data ? 'name' and techpack_data ? 'category' and techpack_data ? 'status') then
    return false;
  end if;
  
  -- Validate status enum
  if not (techpack_data->>'status' in ('draft', 'review', 'approved', 'production')) then
    return false;
  end if;
  
  return true;
end;
$$ language plpgsql;

-- Real-time subscriptions setup (for Supabase Realtime)
alter publication supabase_realtime add table public.techpacks;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.bom_items;
alter publication supabase_realtime add table public.pom_specifications;
alter publication supabase_realtime add table public.construction_details;
alter publication supabase_realtime add table public.care_instructions;
alter publication supabase_realtime add table public.techpack_versions;
alter publication supabase_realtime add table public.refit_requests;
alter publication supabase_realtime add table public.export_jobs;


