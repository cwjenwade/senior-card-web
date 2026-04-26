alter table if exists public.card_catalog add column if not exists image_provider text not null default 'external';
alter table if exists public.card_catalog add column if not exists image_key text not null default '';
alter table if exists public.card_catalog add column if not exists default_prompt text not null default '';
alter table if exists public.card_catalog add column if not exists uploaded_by text not null default 'system';

update public.card_catalog
set
  image_provider = 'external',
  image_key = coalesce(image_key, ''),
  default_prompt = case card_id
    when 'C0001' then '看著這張花開的圖，寫一句今天想對自己說的話。'
    when 'C0002' then '看著這片山林，寫一句今天最想記下的心情。'
    when 'C0003' then '看著這張安靜的圖，寫一句今天想留下的祝福。'
    when 'C0004' then '這張圖讓你想到什麼？寫一句今天的問候。'
    when 'C0005' then '看著這張有光的圖，寫一句今天想鼓勵自己的話。'
    when 'C0006' then '看著這張平靜的圖，寫一句今天想守住的心情。'
    else coalesce(default_prompt, prompt, '')
  end,
  uploaded_by = 'system-seed',
  style_sub = case card_id
    when 'C0001' then '溫柔晨光'
    when 'C0002' then '舒心散步'
    when 'C0003' then '靜心平安'
    when 'C0004' then '柔和問候'
    when 'C0005' then '向光而行'
    when 'C0006' then '安心祝福'
    else coalesce(style_sub, '')
  end,
  energy_level = case card_id
    when 'C0002' then 'uplift'
    when 'C0005' then 'uplift'
    when 'C0003' then 'calm'
    when 'C0006' then 'calm'
    else coalesce(energy_level, 'steady')
  end,
  image_url = case card_id
    when 'C0001' then 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80'
    when 'C0002' then 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
    when 'C0003' then 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
    when 'C0004' then 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80'
    when 'C0005' then 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80'
    when 'C0006' then 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80'
    else coalesce(image_url, '')
  end,
  prompt = case
    when coalesce(prompt, '') = '' then coalesce(default_prompt, '')
    else prompt
  end,
  cc0_source = ''
where card_id in ('C0001', 'C0002', 'C0003', 'C0004', 'C0005', 'C0006');
