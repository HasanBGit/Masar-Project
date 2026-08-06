// Side panel for a single comment pin's thread - the composer for a brand
// new pin (no comment yet, just a captured 3D point) and the reply/resolve
// view for an existing one. Kept as one component since both states share
// the same panel chrome and only differ in what's above the reply box.
import { useState } from 'react';
import { CheckCircle2, Crosshair, Trash2, X } from 'lucide-react';
import type { DrawingComment } from '../../../lib/types';

export interface CommentThreadPanelProps {
  /** Root comment plus its replies, oldest first. Empty while composing a new pin. */
  thread: DrawingComment[];
  /** True when the panel represents a just-placed pin with no comment yet. */
  isNewPin: boolean;
  busy: boolean;
  error: string | null;
  meId: number | undefined;
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onSubmitNew: (body: string) => void;
  onReply: (body: string) => void;
  onToggleResolved: (resolved: boolean) => void;
  onDelete: (commentId: number) => void;
  onJumpToViewpoint: () => void;
}

export function CommentThreadPanel({
  thread,
  isNewPin,
  busy,
  error,
  meId,
  isOwnerOrAdmin,
  onClose,
  onSubmitNew,
  onReply,
  onToggleResolved,
  onDelete,
  onJumpToViewpoint,
}: CommentThreadPanelProps) {
  const [draft, setDraft] = useState('');
  const root = thread[0];
  const replies = thread.slice(1);

  function submit() {
    const body = draft.trim();
    if (!body || busy) return;
    if (isNewPin) onSubmitNew(body);
    else onReply(body);
    setDraft('');
  }

  return (
    <div className="absolute end-0 top-0 z-20 flex h-full w-72 flex-col border-s border-sand bg-white/97 shadow-lg sm:w-80">
      <div className="flex items-center justify-between border-b border-sand px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-navy">
          {isNewPin ? 'New Comment Pin' : `Comment Thread${root?.resolved ? ' (Resolved)' : ''}`}
        </span>
        <button onClick={onClose} aria-label="Close comment panel" className="rounded p-1 text-navy/40 transition hover:text-navy">
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!isNewPin && root && (
          <>
            <button
              onClick={onJumpToViewpoint}
              className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-navy/60 underline transition hover:text-navy"
            >
              <Crosshair size={12} aria-hidden="true" /> Jump to this view
            </button>
            <div className="flex flex-col gap-3">
              {[root, ...replies].map((c) => (
                <div key={c.id} className="rounded-[var(--radius-s)] border border-sand bg-paper p-2.5 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-navy">{c.author_name || 'Project member'}</span>
                    {(c.author === meId || isOwnerOrAdmin) && (
                      <button
                        onClick={() => onDelete(c.id)}
                        aria-label="Delete comment"
                        className="rounded p-0.5 text-navy/30 transition hover:text-status-escalated"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-navy/80">{c.body}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {isNewPin && (
          <p className="mb-3 text-xs text-navy/60">Location and camera view captured. Add a comment to drop the pin.</p>
        )}

        {error && <p className="mt-2 text-xs font-semibold text-status-escalated">{error}</p>}
      </div>

      <div className="border-t border-sand p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isNewPin ? 'Describe what needs to change...' : 'Reply...'}
          rows={3}
          className="mb-2 w-full resize-none rounded-[var(--radius-s)] border border-sand bg-white p-2 text-xs text-navy focus:border-navy"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={submit}
            disabled={busy || !draft.trim()}
            className="rounded-[var(--radius-s)] bg-navy px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-navy-deep disabled:opacity-50"
          >
            {isNewPin ? 'Add Comment' : 'Reply'}
          </button>
          {!isNewPin && root && (
            <button
              onClick={() => onToggleResolved(!root.resolved)}
              disabled={busy}
              className={`flex items-center gap-1.5 rounded-[var(--radius-s)] border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                root.resolved ? 'border-sand bg-white text-navy hover:bg-cream' : 'border-status-agreeing bg-status-agreeing/10 text-status-agreeing'
              }`}
            >
              <CheckCircle2 size={13} aria-hidden="true" /> {root.resolved ? 'Reopen' : 'Resolve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
