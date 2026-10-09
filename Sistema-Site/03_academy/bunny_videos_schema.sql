create table academy_videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  course_id uuid not null,
  bunny_video_id text not null,
  bunny_library_id integer,
  video_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Índices pra performance
create index idx_course_id on academy_videos(course_id);
create index idx_bunny_video_id on academy_videos(bunny_video_id);
