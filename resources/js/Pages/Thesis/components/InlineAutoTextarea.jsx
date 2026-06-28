import React, { useEffect, useRef, useState } from 'react';

// Keeps typing responsive by committing textarea changes after a short pause
// instead of forcing document pagination on every keystroke.
export default function InlineAutoTextarea({
  value,
  onCommit,
  delay = 250,
  autoResize = true,
  ...rest
}) {
  const [val, setVal] = useState(value ?? '');
  const taRef = useRef(null);
  const timerRef = useRef(null);
  const lastCommittedRef = useRef(value ?? '');
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const valRef = useRef(val);
  valRef.current = val;

  const autosize = () => {
    if (!autoResize) return;
    const el = taRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const commit = (text) => {
    lastCommittedRef.current = text;
    onCommitRef.current?.(text);
  };

  useEffect(() => {
    autosize();
  }, []);

  useEffect(() => {
    if (value === lastCommittedRef.current) return;
    lastCommittedRef.current = value ?? '';
    setVal(value ?? '');
    requestAnimationFrame(autosize);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (valRef.current !== lastCommittedRef.current) commit(valRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const next = e.target.value;
    setVal(next);
    autosize();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(next), delay);
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (valRef.current !== lastCommittedRef.current) commit(valRef.current);
  };

  return (
    <textarea
      ref={taRef}
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      {...rest}
    />
  );
}

