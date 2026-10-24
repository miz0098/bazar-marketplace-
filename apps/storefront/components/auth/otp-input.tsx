'use client';

import { useRef } from 'react';
import { distributeOtpDigits, normalizeOtpDigits } from '@/domain/identity/identity';

interface OtpInputProps {
  readonly errorId: string;
  readonly invalid: boolean;
  readonly labelId: string;
  readonly onChange: (value: readonly string[]) => void;
  readonly value: readonly string[];
}

export function OtpInput({ errorId, invalid, labelId, onChange, value }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusAt = (index: number) => inputRefs.current[Math.max(0, Math.min(5, index))]?.focus();
  const updateAt = (index: number, digit: string) => {
    const next = [...value];
    next[index] = digit;
    onChange(next);
  };

  return (
    <div className="auth-otp" role="group" aria-labelledby={labelId}>
      <span className="auth-otp__label" id={labelId}>Код підтвердження</span>
      <div className="auth-otp__inputs">
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            ref={(element) => { inputRefs.current[index] = element; }}
            className="auth-otp__input"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`Цифра ${index + 1} з 6`}
            aria-describedby={errorId}
            aria-invalid={invalid}
            data-auth-initial-focus={index === 0 ? '' : undefined}
            value={value[index] ?? ''}
            onChange={(event) => {
              const digits = normalizeOtpDigits(event.currentTarget.value);
              if (digits.length > 1) {
                const distributed = distributeOtpDigits(digits);
                onChange(distributed);
                focusAt(Math.min(digits.length, 6) - 1);
                return;
              }
              updateAt(index, digits);
              if (digits && index < 5) focusAt(index + 1);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') { event.preventDefault(); focusAt(index - 1); }
              if (event.key === 'ArrowRight') { event.preventDefault(); focusAt(index + 1); }
              if (event.key === 'Home') { event.preventDefault(); focusAt(0); }
              if (event.key === 'End') { event.preventDefault(); focusAt(5); }
              if (event.key === 'Delete') { event.preventDefault(); updateAt(index, ''); }
              if (event.key === 'Backspace') {
                event.preventDefault();
                if (value[index]) updateAt(index, '');
                else if (index > 0) {
                  const next = [...value];
                  next[index - 1] = '';
                  onChange(next);
                  focusAt(index - 1);
                }
              }
            }}
            onPaste={(event) => {
              const digits = normalizeOtpDigits(event.clipboardData.getData('text'));
              if (!digits) return;
              event.preventDefault();
              onChange(distributeOtpDigits(digits));
              focusAt(Math.min(digits.length, 6) - 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}
