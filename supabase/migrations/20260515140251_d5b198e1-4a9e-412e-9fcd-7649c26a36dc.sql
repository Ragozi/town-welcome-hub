
-- Rename existing enum values and add the new ones. Two-step migration:
-- this part only renames + adds. A follow-up migration will use the new
-- values inside policies and functions (Postgres requires the values to
-- be committed before they can be referenced).

ALTER TYPE public.app_role RENAME VALUE 'admin' TO 'super_admin';
ALTER TYPE public.app_role RENAME VALUE 'realtor' TO 'realtor_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'realtor_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sponsor_user';
