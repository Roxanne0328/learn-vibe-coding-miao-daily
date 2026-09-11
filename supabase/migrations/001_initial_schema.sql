-- 喵日常 v1.1.0 · 云端同步数据库脚本
-- 在 Supabase SQL Editor 中执行（项目 ref: elvlygokedgbaihbdgrg）
--
-- 设计说明：为降低出错率、保证今天能稳定上线，
-- 采用「单表同步」模型：每位用户一行，payload 存完整应用状态(JSON)，
-- 通过 RLS 行级安全保证用户之间数据相互隔离。

-- 1. 用户数据表（每位用户一行）
create table if not exists user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default now() not null
);

-- 2. 自动更新 updated_at
create or replace function update_user_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_data_updated_at on user_data;
create trigger trg_user_data_updated_at
  before update on user_data
  for each row execute function update_user_data_updated_at();

-- 3. 行级安全：用户只能读写自己的那一行
alter table user_data enable row level security;

drop policy if exists "Users manage own user_data" on user_data;
create policy "Users manage own user_data"
  on user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. 索引
create index if not exists idx_user_data_user on user_data(user_id);
