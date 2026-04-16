CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');

ALTER TABLE public.tasks
ADD COLUMN priority public.task_priority NOT NULL DEFAULT 'medium';