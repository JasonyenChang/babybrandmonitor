-- 嬰幼兒用品監測站 資料表
-- 依 API-CONTRACT.md 設計。updated_at 用 bigint 存 epoch 毫秒，前端 new Date(ts) 直接吃。

create table if not exists brands (
  id           text primary key,
  category     text not null check (category in ('diaper','food','formula')),
  name         text not null,
  sentiment    text not null default 'neutral' check (sentiment in ('positive','neutral','negative')),
  has_negative boolean not null default false,
  updated_at   bigint
);

create table if not exists series (
  id       bigint generated always as identity primary key,
  brand_id text not null references brands(id) on delete cascade,
  name     text not null default '',
  origin   text not null default ''
);

create table if not exists news_items (
  id       bigint generated always as identity primary key,
  brand_id text not null references brands(id) on delete cascade,
  title    text not null default '',
  source   text not null default '',
  url      text not null default ''
);

create table if not exists social_items (
  id       bigint generated always as identity primary key,
  brand_id text not null references brands(id) on delete cascade,
  title    text not null default '',
  source   text not null default '',
  url      text not null default ''
);

create index if not exists idx_brands_category   on brands(category);
create index if not exists idx_series_brand       on series(brand_id);
create index if not exists idx_news_brand         on news_items(brand_id);
create index if not exists idx_social_brand       on social_items(brand_id);
