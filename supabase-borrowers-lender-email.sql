alter table public.borrowers
add column if not exists lender_email text;

create index if not exists borrowers_lender_email_idx
on public.borrowers (lender_email);
