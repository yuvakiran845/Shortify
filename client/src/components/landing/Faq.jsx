import { ChevronDown } from 'lucide-react';
import Container from '../layout/Container';
import SectionHeading from './SectionHeading';

const FAQS = [
  {
    question: 'What does a URL shortener do?',
    answer:
      'It creates a short link that redirects to your original, longer address. Short links are easier to share in messages, social posts, and print, and they let you count how many times a link was opened.',
  },
  {
    question: 'Can I choose my own short link?',
    answer:
      'Yes. You can set a custom alias using letters, numbers, hyphens, and underscores, as long as nobody else is already using it.',
  },
  {
    question: 'Do short links expire?',
    answer: 'Only if you want them to. You can add an optional expiration date, and you can switch a link off at any time.',
  },
  {
    question: 'Are the QR codes free to download?',
    answer: 'Yes. Every QR code can be downloaded as a PNG image, and it always points to the exact link you entered.',
  },
  {
    question: 'What click data does Shortify collect?',
    answer:
      'Shortify records when a link is opened, along with basic details such as the referring website and device type. It does not store visitors’ IP addresses.',
  },
  {
    question: 'Which links can I shorten?',
    answer:
      'Any valid web address that uses http or https. Other link types, such as javascript: or file: links, are blocked for safety.',
  },
];

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t border-line bg-surface py-20 sm:py-24">
      <Container size="narrow">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Frequently asked questions" />

        {/* Native <details>/<summary> gives keyboard and screen-reader support for free */}
        <div className="mt-12 divide-y divide-line rounded-xl border border-line bg-white shadow-card">
          {FAQS.map(({ question, answer }) => (
            <details key={question} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 text-left text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDown
                  className="size-5 shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="-mt-1 pb-5 text-sm leading-6 text-ink-muted">{answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
