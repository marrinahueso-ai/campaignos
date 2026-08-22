-- Allow School Poster (11×17) and Event Poster (18×24) flyer print sizes.
alter table public.flyers
  drop constraint if exists flyers_print_size_check;

alter table public.flyers
  add constraint flyers_print_size_check
  check (
    print_size in ('letter', 'half', 'school_poster', 'event_poster')
  );
