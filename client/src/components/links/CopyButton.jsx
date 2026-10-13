import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Button from '../ui/Button';
import { copyText } from '../../lib/clipboard';
import { toast } from '../../lib/toast';

const COPIED_RESET_MS = 2000;

/**
 * Copies `text` and briefly shows "Copied".
 * `iconOnly` hides the text visually but keeps an accessible label.
 */
export default function CopyButton({
  text,
  label = 'Copy link',
  successMessage = 'Short link copied to clipboard.',
  variant = 'secondary',
  size = 'sm',
  iconOnly = false,
  className,
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);

  // Clear the timer if the button disappears first.
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function handleCopy() {
    try {
      await copyText(text);
      setCopied(true);
      toast.success(successMessage);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error('Could not copy automatically. Select the link and copy it manually.');
    }
  }

  const Icon = copied ? Check : Copy;
  const currentLabel = copied ? 'Copied' : label;

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? 'secondary' : variant}
      size={size}
      className={className}
      aria-label={iconOnly ? `${currentLabel}: ${text}` : undefined}
      title={iconOnly ? currentLabel : undefined}
    >
      <Icon className={copied ? 'size-4 text-emerald-600' : 'size-4'} aria-hidden="true" />
      {!iconOnly && currentLabel}
    </Button>
  );
}
