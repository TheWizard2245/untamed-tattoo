"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: ReactNode;
  invalid?: boolean;
  multiline?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export function TextField({ label, value, onChange, required, hint, invalid, multiline, id, ...rest }: TextFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx("field", invalid && "invalid")}>
      <label className={cx(required && "req")} htmlFor={fid}>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      {multiline ? (
        <textarea id={fid} rows={6} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} />
      ) : (
        <input id={fid} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} {...rest} />
      )}
    </div>
  );
}

type Option = { value: string; label: ReactNode };

export function RadioGroup({ legend, name, options, value, onChange, required, invalid, cols }: {
  legend: string; name: string; options: readonly Option[]; value: string; onChange: (v: string) => void;
  required?: boolean; invalid?: boolean; cols?: boolean;
}) {
  return (
    <fieldset className={cx("field", invalid && "invalid")}>
      <legend className={cx(required && "req")}>{legend}</legend>
      <div className={cx("checks", cols && "cols")}>
        {options.map((o) => (
          <label className="check" key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} /> {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckGroup({ legend, options, value, onChange, required, invalid, cols, children }: {
  legend: string; options: readonly Option[]; value: string[]; onChange: (v: string[]) => void;
  required?: boolean; invalid?: boolean; cols?: boolean; children?: ReactNode;
}) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className={cx("field", invalid && "invalid")}>
      <legend className={cx(required && "req")}>{legend}</legend>
      {children}
      <div className={cx("checks", cols && "cols")}>
        {options.map((o) => (
          <label className="check" key={o.value}>
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} /> {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {children}
    </label>
  );
}

export function YesNo({ id, question, value, onChange, invalid }: {
  id: string; question: string; value?: "Yes" | "No"; onChange: (v: "Yes" | "No") => void; invalid?: boolean;
}) {
  return (
    <div className={cx("yn", invalid && "invalid")}>
      <span className="q" id={`q-${id}`}>{question}</span>
      <div className="opts" role="radiogroup" aria-labelledby={`q-${id}`}>
        {(["Yes", "No"] as const).map((v) => (
          <label key={v}>
            <input type="radio" name={`yn_${id}`} checked={value === v} onChange={() => onChange(v)} />
            {v.toUpperCase()}
          </label>
        ))}
      </div>
    </div>
  );
}
