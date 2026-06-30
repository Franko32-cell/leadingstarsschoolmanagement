import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ({ title = 'Frequently Asked Questions', faqs }) {
  const [open, setOpen] = useState(0);

  return (
    <section className="py-16 bg-slate-50" aria-labelledby="faq-heading">
      <div className="max-w-4xl mx-auto px-6">
        <h2
          id="faq-heading"
          className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-3 text-center"
        >
          {title}
        </h2>
        <p className="text-center text-slate-600 mb-12">
          Answers to questions parents most frequently ask us.
        </p>

        <dl className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <dt>
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                  className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 hover:bg-slate-50 transition"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${open === i ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </dt>
              {open === i && (
                <dd className="px-5 pb-5 text-slate-700 leading-relaxed">
                  {faq.answer}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}