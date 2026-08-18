'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'e3dad-lesson-prep:';
const SAVE_DELAY_MS = 400;

export interface LessonPrepDraft {
  text: string;
  updatedAt: string | null;
}

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readDraft(email: string): LessonPrepDraft {
  if (typeof window === 'undefined') {
    return { text: '', updatedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) return { text: '', updatedAt: null };
    const parsed = JSON.parse(raw) as Partial<LessonPrepDraft>;
    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return { text: '', updatedAt: null };
  }
}

/** Read-only lookup — never writes. Used by المقيم to view a team leader's notebook. */
export function readLessonPrepDraft(email: string | null | undefined): LessonPrepDraft {
  if (!email) return { text: '', updatedAt: null };
  return readDraft(email);
}

export function useLessonPrepReader(email: string | null | undefined, reloadKey?: unknown) {
  const [draft, setDraft] = useState<LessonPrepDraft>({ text: '', updatedAt: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDraft(readLessonPrepDraft(email));
    setLoaded(true);
  }, [email, reloadKey]);

  return {
    text: draft.text,
    updatedAt: draft.updatedAt,
    loaded,
    hasDraft: draft.text.trim().length > 0,
  };
}

function writeDraft(email: string, draft: LessonPrepDraft) {
  window.localStorage.setItem(storageKey(email), JSON.stringify(draft));
}

export function useLessonPrep(email: string | null | undefined, reloadKey?: unknown) {
  const [text, setTextState] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef('');

  useEffect(() => {
    if (!email) {
      setTextState('');
      setUpdatedAt(null);
      setLoaded(false);
      return;
    }
    const draft = readDraft(email);
    setTextState(draft.text);
    textRef.current = draft.text;
    setUpdatedAt(draft.updatedAt);
    setLoaded(true);
    setSaveState(draft.text ? 'saved' : 'idle');
  }, [email, reloadKey]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const persist = useCallback(
    (nextText: string) => {
      if (!email) return;
      const draft: LessonPrepDraft = {
        text: nextText,
        updatedAt: nextText.trim() ? new Date().toISOString() : null,
      };
      try {
        if (!nextText.trim()) {
          window.localStorage.removeItem(storageKey(email));
        } else {
          writeDraft(email, draft);
        }
        setUpdatedAt(draft.updatedAt);
        setSaveState('saved');
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaveState('idle'), 1800);
      } catch (err) {
        console.error('[LessonPrep] Failed to save locally:', err);
        setSaveState('idle');
      }
    },
    [email]
  );

  const setText = useCallback(
    (next: string) => {
      textRef.current = next;
      setTextState(next);
      if (!email) return;
      setSaveState('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), SAVE_DELAY_MS);
    },
    [email, persist]
  );

  const flush = useCallback(() => {
    if (!email) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    persist(textRef.current);
  }, [email, persist]);

  const appendSection = useCallback(
    (block: string) => {
      const trimmed = text.trimEnd();
      const next = trimmed ? `${trimmed}\n\n${block}` : block;
      setText(next);
    },
    [text, setText]
  );

  const clearDraft = useCallback(() => {
    textRef.current = '';
    setTextState('');
    persist('');
  }, [persist]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    text,
    setText,
    appendSection,
    clearDraft,
    updatedAt,
    loaded,
    saveState,
    wordCount,
    hasDraft: text.trim().length > 0,
    flush,
  };
}
