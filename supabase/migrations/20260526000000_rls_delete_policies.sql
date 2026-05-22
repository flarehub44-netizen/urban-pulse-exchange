-- Adds missing DELETE RLS policies for social feed tables.
-- Without these, authenticated users cannot unlike, undo reposts, or delete their own posts/comments.

create policy "feed_likes_delete_own"
  on public.feed_likes for delete to authenticated
  using (auth.uid() = user_id);

create policy "feed_reposts_delete_own"
  on public.feed_reposts for delete to authenticated
  using (auth.uid() = user_id);

create policy "feed_comments_delete_own"
  on public.feed_comments for delete to authenticated
  using (auth.uid() = user_id);

create policy "feed_posts_delete_own"
  on public.feed_posts for delete to authenticated
  using (auth.uid() = user_id);
