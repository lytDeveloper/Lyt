-- Enable Realtime
alter publication supabase_realtime add table chat_messages;

-- 1. Chat Rooms Table
create table public.chat_rooms (
  id uuid default gen_random_uuid() primary key,
  type text check (type in ('project', 'team', 'partner')) not null,
  title text, -- Optional, for group chats or project names
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Chat Participants Table
create table public.chat_participants (
  room_id uuid references public.chat_rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (room_id, user_id)
);

-- 3. Chat Messages Table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.chat_rooms(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Chat Rooms: Users can view rooms they are participants in
alter table public.chat_rooms enable row level security;

create policy "Users can view rooms they joined"
on public.chat_rooms for select
using (
  exists (
    select 1 from public.chat_participants
    where room_id = chat_rooms.id
    and user_id = auth.uid()
  )
);

-- Chat Participants: Users can view participants of rooms they are in
alter table public.chat_participants enable row level security;

create policy "Users can view participants in their rooms"
on public.chat_participants for select
using (
  exists (
    select 1 from public.chat_participants as cp
    where cp.room_id = chat_participants.room_id
    and cp.user_id = auth.uid()
  )
);

-- Chat Messages: Users can view messages in rooms they belong to
alter table public.chat_messages enable row level security;

create policy "Users can view messages in their rooms"
on public.chat_messages for select
using (
  exists (
    select 1 from public.chat_participants
    where room_id = chat_messages.room_id
    and user_id = auth.uid()
  )
);

create policy "Users can insert messages in their rooms"
on public.chat_messages for insert
with check (
  exists (
    select 1 from public.chat_participants
    where room_id = chat_messages.room_id
    and user_id = auth.uid()
  )
);
