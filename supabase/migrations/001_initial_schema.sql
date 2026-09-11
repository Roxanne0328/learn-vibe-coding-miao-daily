-- 喵日常 v2.0 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行

-- ============================================================
-- 1. 待办表 (todos)
-- ============================================================
create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  text text not null,
  completed boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

comment on table todos is '用户每日待办';
comment on column todos.date is '待办所属日期，按天分组';
comment on column todos.text is '待办内容';
comment on column todos.completed is '是否已完成';

-- ============================================================
-- 2. 习惯列表表 (habits)
-- ============================================================
create table if not exists habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text default '✨' not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, name)
);

comment on table habits is '用户的习惯打卡清单';
comment on column habits.name is '习惯名称';
comment on column habits.emoji is '习惯图标 emoji';
comment on column habits.sort_order is '排序序号';

-- ============================================================
-- 3. 习惯打卡记录表 (habit_records)
-- ============================================================
create table if not exists habit_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date date not null,
  created_at timestamp with time zone default now() not null,
  unique(user_id, habit_id, date)
);

comment on table habit_records is '每天每个习惯的打卡记录';
comment on column habit_records.date is '打卡日期';

-- ============================================================
-- 4. 心情日记表 (moods)
-- ============================================================
create table if not exists moods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  mood_id text not null,
  emoji text not null,
  note text default '' not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, date)
);

comment on table moods is '用户每日心情日记';
comment on column moods.mood_id is '心情类型 id，如 happy/calm/tired';
comment on column moods.emoji is '心情 emoji';
comment on column moods.note is '心情一句话';

-- ============================================================
-- 5. 启用行级安全 (RLS) —— 关键：确保用户数据互相隔离
-- ============================================================
alter table todos enable row level security;
alter table habits enable row level security;
alter table habit_records enable row level security;
alter table moods enable row level security;

-- ============================================================
-- 6. RLS 策略：用户只能读写自己的数据
-- ============================================================

-- todos
create policy "Users can only see their own todos"
  on todos for select
  using (auth.uid() = user_id);

create policy "Users can only insert their own todos"
  on todos for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own todos"
  on todos for update
  using (auth.uid() = user_id);

create policy "Users can only delete their own todos"
  on todos for delete
  using (auth.uid() = user_id);

-- habits
create policy "Users can only see their own habits"
  on habits for select
  using (auth.uid() = user_id);

create policy "Users can only insert their own habits"
  on habits for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own habits"
  on habits for update
  using (auth.uid() = user_id);

create policy "Users can only delete their own habits"
  on habits for delete
  using (auth.uid() = user_id);

-- habit_records
create policy "Users can only see their own habit_records"
  on habit_records for select
  using (auth.uid() = user_id);

create policy "Users can only insert their own habit_records"
  on habit_records for insert
  with check (auth.uid() = user_id);

create policy "Users can only delete their own habit_records"
  on habit_records for delete
  using (auth.uid() = user_id);

-- moods
create policy "Users can only see their own moods"
  on moods for select
  using (auth.uid() = user_id);

create policy "Users can only insert their own moods"
  on moods for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own moods"
  on moods for update
  using (auth.uid() = user_id);

create policy "Users can only delete their own moods"
  on moods for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 7. 索引优化
-- ============================================================
create index if not exists idx_todos_user_date on todos(user_id, date);
create index if not exists idx_habits_user_order on habits(user_id, sort_order);
create index if not exists idx_habit_records_user_date on habit_records(user_id, date);
create index if not exists idx_moods_user_date on moods(user_id, date);

-- ============================================================
-- 8. 自动更新 updated_at 触发器
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_todos_updated_at
  before update on todos
  for each row execute function update_updated_at_column();

create trigger update_habits_updated_at
  before update on habits
  for each row execute function update_updated_at_column();

create trigger update_moods_updated_at
  before update on moods
  for each row execute function update_updated_at_column();
