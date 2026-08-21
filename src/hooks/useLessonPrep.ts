'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION = 'lesson_prep';
const STORAGE_PREFIX = 'e3dad-lesson-prep:';
const SAVE_DELAY_MS = 400;

export interface LessonPrepDraft {
  text: string;
  updatedAt: string | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${normalizeEmail(email)}`;
}

function lessonPrepRef(email: string) {
  return doc(db, COLLECTION, normalizeEmail(email));
}

function emptyDraft(): LessonPrepDraft {
  return { text: '', updatedAt: null };
}

function readLocalDraft(email: string): LessonPrepDraft {
  if (typeof window === 'undefined') return emptyDraft();
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<LessonPrepDraft>;
    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return emptyDraft();
  }
}

function writeLocalDraft(email: string, draft: LessonPrepDraft) {
  if (typeof window === 'undefined') return;
  try {
    if (!draft.text.trim()) {
      window.localStorage.removeItem(storageKey(email));
      return;
    }
    window.localStorage.setItem(storageKey(email), JSON.stringify(draft));
  } catch {
    // Quota or private mode — remote save is the source of truth
  }
}

function clearLocalDraft(email: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(email));
  } catch {
    // ignore
  }
}

function parseRemoteDraft(data: Record<string, unknown> | undefined): LessonPrepDraft {
  if (!data) return emptyDraft();
  const text = typeof data.text === 'string' ? data.text : '';
  const rawUpdated = data.updatedAt;
  let updatedAt: string | null = null;
  if (typeof rawUpdated === 'string') {
    updatedAt = rawUpdated;
  } else if (rawUpdated && typeof rawUpdated === 'object' && 'toDate' in rawUpdated) {
    const date = (rawUpdated as { toDate: () => Date }).toDate();
    updatedAt = Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return { text, updatedAt };
}

async function saveRemoteDraft(email: string, text: string): Promise<LessonPrepDraft> {
  const id = normalizeEmail(email);
  const ref = lessonPrepRef(id);
  if (!text.trim()) {
    await deleteDoc(ref);
    clearLocalDraft(id);
    return emptyDraft();
  }
  const draft: LessonPrepDraft = {
    text,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, {
    email: id,
    text: draft.text,
    updatedAt: draft.updatedAt,
  });
  clearLocalDraft(id);
  return draft;
}

export function useLessonPrepReader(email: string | null | undefined, reloadKey?: unknown) {
  const [draft, setDraft] = useState<LessonPrepDraft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!email) {
      setDraft(emptyDraft());
      setLoaded(true);
      return;
    }

    setLoaded(false);
    const unsubscribe = onSnapshot(
      lessonPrepRef(email),
      (snap) => {
        setDraft(snap.exists() ? parseRemoteDraft(snap.data()) : emptyDraft());
        setLoaded(true);
      },
      (err) => {
        console.error('[LessonPrep] Failed to read notebook:', err);
        setDraft(emptyDraft());
        setLoaded(true);
      }
    );

    return unsubscribe;
  }, [email, reloadKey]);

  return {
    text: draft.text,
    updatedAt: draft.updatedAt,
    loaded,
    hasDraft: draft.text.trim().length > 0,
  };
}

export function useLessonPrep(email: string | null | undefined, reloadKey?: unknown) {
  const [text, setTextState] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef('');
  const dirtyRef = useRef(false);
  const migratedRef = useRef(false);
  const writeGen = useRef(0);

  useEffect(() => {
    migratedRef.current = false;
    dirtyRef.current = false;
  }, [email]);

  useEffect(() => {
    if (!email) {
      setTextState('');
      textRef.current = '';
      setUpdatedAt(null);
      setLoaded(false);
      setSaveState('idle');
      return;
    }

    setLoaded(false);
    const unsubscribe = onSnapshot(
      lessonPrepRef(email),
      (snap) => {
        if (dirtyRef.current) return;

        if (snap.exists()) {
          const remote = parseRemoteDraft(snap.data());
          setTextState(remote.text);
          textRef.current = remote.text;
          setUpdatedAt(remote.updatedAt);
          setLoaded(true);
          setSaveState(remote.text.trim() ? 'saved' : 'idle');
          clearLocalDraft(email);
          return;
        }

        const local = readLocalDraft(email);
        if (local.text.trim() && !migratedRef.current) {
          migratedRef.current = true;
          dirtyRef.current = true;
          setTextState(local.text);
          textRef.current = local.text;
          setUpdatedAt(local.updatedAt);
          setLoaded(true);
          setSaveState('saving');
          saveRemoteDraft(email, local.text)
            .then((draft) => {
              dirtyRef.current = false;
              setUpdatedAt(draft.updatedAt);
              setSaveState('saved');
            })
            .catch((err) => {
              console.error('[LessonPrep] Failed to migrate local notebook:', err);
              dirtyRef.current = false;
              writeLocalDraft(email, local);
              setSaveState('error');
            });
          return;
        }

        setTextState('');
        textRef.current = '';
        setUpdatedAt(null);
        setLoaded(true);
        setSaveState('idle');
      },
      (err) => {
        console.error('[LessonPrep] Failed to subscribe to notebook:', err);
        const local = readLocalDraft(email);
        setTextState(local.text);
        textRef.current = local.text;
        setUpdatedAt(local.updatedAt);
        setLoaded(true);
        setSaveState(local.text.trim() ? 'saved' : 'idle');
      }
    );

    return unsubscribe;
  }, [email, reloadKey]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const persist = useCallback(
    async (nextText: string) => {
      if (!email) return;
      dirtyRef.current = true;
      const gen = ++writeGen.current;
      try {
        const saved = await saveRemoteDraft(email, nextText);
        if (gen !== writeGen.current) return;
        setUpdatedAt(saved.updatedAt);
        setSaveState('saved');
        dirtyRef.current = false;
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaveState('idle'), 1800);
      } catch (err) {
        console.error('[LessonPrep] Failed to save notebook:', err);
        if (gen !== writeGen.current) return;
        const fallback: LessonPrepDraft = {
          text: textRef.current,
          updatedAt: textRef.current.trim() ? new Date().toISOString() : null,
        };
        writeLocalDraft(email, fallback);
        setUpdatedAt(fallback.updatedAt);
        setSaveState('error');
        dirtyRef.current = false;
      }
    },
    [email]
  );

  const setText = useCallback(
    (next: string) => {
      textRef.current = next;
      setTextState(next);
      if (!email) return;
      dirtyRef.current = true;
      setSaveState('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(next);
      }, SAVE_DELAY_MS);
    },
    [email, persist]
  );

  const flush = useCallback(() => {
    if (!email) return;
    const hadTimer = !!saveTimer.current;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!dirtyRef.current && !hadTimer) return;
    void persist(textRef.current);
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
    void persist('');
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
