"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/Input";
import { createHypothesisComment, deleteHypothesisComment, type CommentActionState } from "./comments-actions";

type Comment = { id: string; authorUserId: string; authorName: string; message: string; createdAt: string };
const initialState: CommentActionState = {};

export function CommentFeed({ hypothesisId, currentUserId, comments }: { hypothesisId: string; currentUserId: string; comments: Comment[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createHypothesisComment.bind(null, hypothesisId), initialState);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state]);

  function deleteComment(commentId: string) {
    setDeleteError(null);
    startDeleting(async () => {
      const result = await deleteHypothesisComment(commentId);
      if (result.error) setDeleteError(result.error);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-zinc-900">Комментарии</h2>
      {comments.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Пока нет комментариев.</p> : (
        <ul className="mt-4 divide-y divide-zinc-100 border-y border-zinc-100">
          {comments.map((comment) => <li className="py-4" key={comment.id}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-zinc-900">{comment.authorName}</p><time className="text-xs text-zinc-500" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("ru-RU")}</time></div>
              {comment.authorUserId === currentUserId ? <button className="text-sm text-red-600 hover:underline disabled:opacity-60" disabled={deleting} onClick={() => deleteComment(comment.id)} type="button">Удалить</button> : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{comment.message}</p>
          </li>)}
        </ul>
      )}
      <form action={action} className="mt-5" ref={formRef}>
        <label className="block text-sm font-medium text-zinc-900" htmlFor="comment-message">Новый комментарий</label>
        <Textarea id="comment-message" maxLength={4000} name="message" required rows={4} />
        {state.error || deleteError ? <p className="mt-2 text-sm text-red-700">{state.error ?? deleteError}</p> : null}
        <button className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Добавляем…" : "Добавить комментарий"}</button>
      </form>
    </section>
  );
}
