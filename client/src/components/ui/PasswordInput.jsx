import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';

// Password field with a show/hide toggle. All other props go to <Input>.
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      spellCheck={false}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((isVisible) => !isVisible)}
          // A toggle button keeps one label; aria-pressed announces "on/off".
          aria-label="Show password"
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      }
    />
  );
}
