import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Globe, Link2, QrCode } from 'lucide-react';
import Container from '../components/layout/Container';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import SegmentedControl from '../components/ui/SegmentedControl';
import Select from '../components/ui/Select';
import ColorPicker from '../components/qr/ColorPicker';
import QrHistory from '../components/qr/QrHistory';
import QrResultPanel from '../components/qr/QrResultPanel';
import useAppConfig from '../hooks/useAppConfig';
import useAuth from '../hooks/useAuth';
import useLinkOptions from '../hooks/useLinkOptions';
import usePageTitle from '../hooks/usePageTitle';
import useQrHistory from '../hooks/useQrHistory';
import { withoutProtocol } from '../lib/format';
import { downloadQrPng, QR_COLORS, QR_SIZES } from '../lib/qr';
import { deleteQrCode, saveQrCode } from '../lib/qrApi';
import { ROUTES } from '../lib/routes';
import { toast } from '../lib/toast';
import { validateQrUrl } from '../lib/validateUrl';

const MODES = [
  { value: 'url', label: 'Website URL', icon: Globe },
  { value: 'link', label: 'My short link', icon: Link2 },
];

const truncate = (text, length) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

/**
 * QR code generator.
 * The QR code itself is drawn in the browser (no upload needed). Logged-in
 * users also get a saved history. /qr?link=<id> or /qr?url=<url> pre-fills the form.
 */
export default function QrGenerator() {
  usePageTitle('QR Code Generator');
  const { status } = useAuth();
  const isLoggedIn = status === 'authenticated';
  const [searchParams] = useSearchParams();
  const presetLinkId = searchParams.get('link') ?? '';

  const [mode, setMode] = useState(presetLinkId ? 'link' : 'url');
  const [urlText, setUrlText] = useState(searchParams.get('url') ?? '');
  const [selectedLinkId, setSelectedLinkId] = useState(presetLinkId);
  const [size, setSize] = useState(512);
  const [color, setColor] = useState(QR_COLORS[0].value);
  const [fieldError, setFieldError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [busyHistoryId, setBusyHistoryId] = useState(null);
  const [result, setResult] = useState(null); // { content, isShortLink }

  // The page can stay open while ?link= changes (e.g. "QR code" in the Create
  // link dialog): select the new link. Adjusting state during render is React's
  // recommended way to respond to a changed value.
  const [syncedPresetId, setSyncedPresetId] = useState(presetLinkId);
  if (presetLinkId !== syncedPresetId) {
    setSyncedPresetId(presetLinkId);
    if (presetLinkId) {
      setSelectedLinkId(presetLinkId);
      setMode('link');
      setFieldError('');
    }
  }

  const urlInputRef = useRef(null);
  const resultRef = useRef(null);
  const appConfig = useAppConfig();
  const linkOptions = useLinkOptions(isLoggedIn && mode === 'link', presetLinkId);
  const history = useQrHistory(isLoggedIn);

  // A ?link= id that is not one of the user's links (deleted, or someone else's):
  // say so and select the newest link, instead of a choice that cannot work.
  const presetMissing =
    Boolean(presetLinkId) &&
    selectedLinkId === presetLinkId &&
    Boolean(linkOptions.links) &&
    !linkOptions.links.some((link) => link.id === presetLinkId);
  // Until the user picks one, the newest link is selected.
  const effectiveLinkId = (presetMissing ? '' : selectedLinkId) || linkOptions.links?.[0]?.id || '';
  const shortLinkBaseUrl = appConfig?.shortLinkBaseUrl;
  const isShortLinkUrl = (text) => Boolean(shortLinkBaseUrl && text.startsWith(`${shortLinkBaseUrl}/`));

  function showResult(content) {
    setResult({ content, isShortLink: isShortLinkUrl(content) });
    // On phones the preview sits below the form, so bring it into view.
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  async function handleGenerate(event) {
    event.preventDefault();
    if (generating) return;
    setFieldError('');

    let content;
    let target;
    if (mode === 'url') {
      const check = validateQrUrl(urlText, { shortLinkBaseUrl });
      if (!check.ok) {
        setFieldError(check.message);
        urlInputRef.current?.focus();
        return;
      }
      content = check.url;
      target = { url: check.url };
    } else {
      const link = linkOptions.links?.find((option) => option.id === effectiveLinkId);
      if (!link) {
        setFieldError('Choose one of your links.');
        return;
      }
      content = link.shortUrl;
      target = { linkId: link.id };
    }

    if (!isLoggedIn) {
      showResult(content);
      return;
    }

    // Logged in: also save it to the history. The server returns the exact
    // content it validated, which is what we encode.
    setGenerating(true);
    try {
      const saved = await saveQrCode(target);
      showResult(saved.content);
      history.reload();
    } catch (error) {
      if (error.field === 'url' || error.field === 'linkId') {
        setFieldError(error.message);
      } else {
        showResult(content);
        toast.error('Your QR code is ready, but it could not be saved to your history.');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(content, setBusy = setDownloading) {
    setBusy(true);
    try {
      await downloadQrPng(content, { size, color });
      toast.success('QR code downloaded.');
    } catch {
      toast.error('Could not create the PNG image. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteHistoryItem(item) {
    setBusyHistoryId(item.id);
    try {
      await deleteQrCode(item.id);
      history.remove(item.id);
      toast.success('Removed from your QR code history.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyHistoryId(null);
    }
  }

  return (
    <Container className="py-10 sm:py-12">
      <div className="max-w-2xl">
        <Badge tone="brand">
          <QrCode className="size-3.5" aria-hidden="true" />
          QR code generator
        </Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Create a QR code</h1>
        <p className="mt-2 text-ink-muted">
          Turn a website or one of your short links into a QR code you can download as a PNG for print, packaging, or slides.
        </p>
      </div>

      {/* Narrow: form, preview, history stacked. Wide: preview in a sticky right column.
          "@container" + "@4xl:" (a container query) switches on the width this page
          actually has, so the app sidebar never squeezes the form into a narrow column. */}
      <div className="@container mt-8">
        <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1fr)_380px] @4xl:items-start">
          <Card padding="lg" className="@4xl:col-start-1">
            <form onSubmit={handleGenerate} noValidate className="space-y-6">
              <SegmentedControl
                legend="What should the QR code open?"
                name="mode"
                options={MODES}
                value={mode}
                onChange={(value) => {
                  setMode(value);
                  setFieldError('');
                }}
              />
  
              {mode === 'url' && (
                <Input
                  ref={urlInputRef}
                  label="Website URL"
                  name="url"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="https://example.com/menu"
                  value={urlText}
                  onChange={(event) => {
                    setUrlText(event.target.value);
                    if (fieldError) setFieldError('');
                  }}
                  error={fieldError}
                  hint="Any http or https link. Long URLs make dense codes, so shorten them first when you can."
                />
              )}
  
              {mode === 'link' && !isLoggedIn && (
                <Alert title="Log in to use your short links">
                  <p>Your short links live in your account. You can still make a QR code for any website URL.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button to={ROUTES.login} state={{ from: `${ROUTES.qr}${presetLinkId ? `?link=${presetLinkId}` : ''}` }} size="sm">
                      Log in
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setMode('url')}>
                      Use a website URL
                    </Button>
                  </div>
                </Alert>
              )}
  
              {mode === 'link' && isLoggedIn && presetMissing && (
                <Alert tone="warning" title="That link was not found">
                  It is not in your account and may have been deleted. Your newest link is selected instead.
                </Alert>
              )}
  
              {mode === 'link' && isLoggedIn && (
                <LinkPicker
                  options={linkOptions}
                  value={effectiveLinkId}
                  onChange={(id) => {
                    setSelectedLinkId(id);
                    setFieldError('');
                  }}
                  error={fieldError}
                />
              )}
  
              <div className="grid gap-6 sm:grid-cols-2">
                <Select
                  label="Image size"
                  options={QR_SIZES}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
                <ColorPicker legend="Color" name="color" colors={QR_COLORS} value={color} onChange={setColor} />
              </div>
  
              <Button
                type="submit"
                size="lg"
                loading={generating}
                disabled={mode === 'link' && (!isLoggedIn || !linkOptions.links?.length)}
                className="w-full sm:w-auto"
              >
                {!generating && <QrCode className="size-5" aria-hidden="true" />}
                {generating ? 'Generating…' : 'Generate QR code'}
              </Button>
  
              {!isLoggedIn && (
                <p className="text-sm text-ink-muted">
                  Tip: log in to keep a history of your QR codes so you can download them again later.
                </p>
              )}
            </form>
          </Card>
  
          {/* aria-live: screen readers hear when a new QR code is ready */}
          <div
            ref={resultRef}
            aria-live="polite"
            className="scroll-mt-24 @4xl:sticky @4xl:top-24 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1"
          >
            <QrResultPanel
              content={result?.content}
              isShortLink={result?.isShortLink}
              color={color}
              size={size}
              downloading={downloading}
              onDownload={() => handleDownload(result.content)}
            />
          </div>
  
          {isLoggedIn && (
            <div className="@4xl:col-start-1">
              <QrHistory
                items={history.items}
                loading={history.loading}
                error={history.error}
                onRetry={history.reload}
                onShow={(item) => showResult(item.content)}
                onDownload={(item) => handleDownload(item.content, () => {})}
                onDelete={handleDeleteHistoryItem}
                busyId={busyHistoryId}
              />
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function LinkPicker({ options, value, onChange, error }) {
  if (options.error) {
    return (
      <Alert tone="error" title="Could not load your links">
        <p>{options.error.message}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={options.reload}>
          Try again
        </Button>
      </Alert>
    );
  }

  if (options.loading) {
    return <Select label="Short link" options={[{ value: '', label: 'Loading your links…' }]} value="" disabled />;
  }

  if (!options.links?.length) {
    return (
      <Alert title="You do not have any short links yet">
        <p>Shorten a URL first, then come back to make its QR code.</p>
        <Button to={ROUTES.shorten} size="sm" className="mt-3">
          Shorten a URL
        </Button>
      </Alert>
    );
  }

  const choices = options.links.map((link) => ({
    value: link.id,
    label: `${withoutProtocol(link.shortUrl)} → ${truncate(withoutProtocol(link.originalUrl), 40)}`,
  }));

  return (
    <div>
      <Select label="Short link" name="linkId" options={choices} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : (
        options.total > options.links.length && (
          <p className="mt-1.5 text-sm text-ink-subtle">Showing your {options.links.length} newest links.</p>
        )
      )}
    </div>
  );
}
