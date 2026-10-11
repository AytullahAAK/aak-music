import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { ARTIST_SERVICES, ArtistService } from '../data/services';
import { site } from '../data';
import Button from '../components/Button';

export default function ServicesSection() {
  const [selectedService, setSelectedService] = useState<ArtistService>(ARTIST_SERVICES[0]);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('Full Track Production');
  const [inquiryDetails, setInquiryDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const r = useReveal<HTMLDivElement>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = site.contact || 'mailto:hello@example.com';
    const subject = encodeURIComponent(`[AAK Music Inquiry] ${inquiryType} - ${inquiryName}`);
    const body = encodeURIComponent(
      `Name: ${inquiryName}\nEmail: ${inquiryEmail}\nService: ${inquiryType}\n\nProject Details:\n${inquiryDetails}`
    );

    window.open(`${mailto}?subject=${subject}&body=${body}`, '_blank');
    setSubmitted(true);
  };

  return (
    <section id="services" className="relative min-h-[100svh] px-4 py-20 sm:px-6 md:px-12 md:py-36">
      <div ref={r} className="reveal mx-auto min-w-0 max-w-[1600px]">
        {/* Header */}
        <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1 text-xs font-mono font-medium tracking-widest text-violet">
              <span>CREATIVE CAPABILITIES & SERVICES</span>
            </div>
            <h2 className="mt-4 max-w-full whitespace-normal break-words font-display text-3xl font-extrabold leading-[.92] tracking-[-.03em] sm:text-5xl md:text-7xl">
              ARTIST SERVICES & <br />
              COLLABORATION.
            </h2>
          </div>
          <p className="min-w-0 max-w-md text-xs leading-relaxed text-bone/70 sm:text-sm">
            Professional electronic music production, sound design, custom scoring, and mix engineering
            available for labels, filmmakers, game studios, and vocalists.
          </p>
        </div>

        {/* Services Showcase Grid */}
        <div className="mt-12 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left: Service Selector Tabs */}
          <div className="min-w-0 space-y-3 lg:col-span-5">
            <span className="block font-mono text-xs uppercase tracking-wider text-bone/50 mb-2">
              Select Area of Expertise:
            </span>
            {ARTIST_SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s)}
                className={`flex min-w-0 w-full max-w-full flex-col rounded-2xl border p-4 text-left transition-all ${
                  selectedService.id === s.id
                    ? 'border-cyan bg-cyan/15 shadow-[0_0_24px_rgba(95,212,255,0.25)]'
                    : 'border-bone/15 bg-void/50 hover:border-bone/40'
                }`}
              >
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-words font-display text-lg font-bold text-bone">{s.title}</span>
                  <span className="shrink-0 rounded bg-bone/10 px-2 py-0.5 font-mono text-[10px] text-cyan">
                    {s.category}
                  </span>
                </div>
                <p className="mt-1 text-xs text-bone/70">{s.tagline}</p>
              </button>
            ))}
          </div>

          {/* Right: Detailed Service Card */}
          <div className="min-w-0 lg:col-span-7">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-bone/15 bg-ink/80 p-6 backdrop-blur-2xl sm:p-8">
              <div>
                <div className="flex items-center justify-between border-b border-bone/10 pb-4">
                  <span className="font-mono text-xs text-cyan">{selectedService.category.toUpperCase()}</span>
                  <span className="font-mono text-xs text-bone/50">{selectedService.specs}</span>
                </div>

                <h3 className="mt-4 font-display text-2xl font-extrabold text-bone sm:text-3xl">
                  {selectedService.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-bone/80 sm:text-base">
                  {selectedService.description}
                </p>

                {/* Deliverables List */}
                <div className="mt-6 border-t border-bone/10 pt-4">
                  <span className="block font-mono text-xs uppercase tracking-wider text-bone/60">
                    Standard Deliverables & Inclusions:
                  </span>
                  <ul className="mt-3 space-y-2">
                    {selectedService.deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-xs text-bone/85 sm:text-sm">
                        <span className="text-cyan font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Inquiry Action */}
              <div className="mt-8 border-t border-bone/10 pt-6">
                <a
                  href="#contact-form"
                  onClick={() => setInquiryType(selectedService.title)}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan px-6 py-3 font-mono text-xs font-bold text-ink shadow-[0_0_24px_rgba(95,212,255,0.4)] transition hover:bg-bone"
                >
                  REQUEST THIS SERVICE →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DIRECT BOOKING & INQUIRY FORM */}
        <div id="contact-form" className="mt-16 rounded-3xl border border-bone/15 bg-void/70 p-6 backdrop-blur-2xl sm:p-10">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-wider text-cyan">
              DIRECT INQUIRY
            </span>
            <h3 className="mt-2 font-display text-2xl font-extrabold text-bone sm:text-4xl">
              Initiate a Project or Booking.
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-bone/70 sm:text-sm">
              Send a direct message detailing your project scope, timeline, and musical vision.
              All inquiries receive a personal response.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block font-mono text-xs text-bone/70">
                Your Name / Label / Artist Name
              </label>
              <input
                id="name"
                type="text"
                required
                placeholder="e.g. Alex Rivera"
                value={inquiryName}
                onChange={(e) => setInquiryName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-bone/20 bg-ink/80 px-4 py-2.5 font-mono text-xs text-bone placeholder:text-bone/40 focus:border-cyan focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="email" className="block font-mono text-xs text-bone/70">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@domain.com"
                value={inquiryEmail}
                onChange={(e) => setInquiryEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-bone/20 bg-ink/80 px-4 py-2.5 font-mono text-xs text-bone placeholder:text-bone/40 focus:border-cyan focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="service" className="block font-mono text-xs text-bone/70">
                Service of Interest
              </label>
              <select
                id="service"
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-bone/20 bg-ink/80 px-4 py-2.5 font-mono text-xs text-bone focus:border-cyan focus:outline-none"
              >
                {ARTIST_SERVICES.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.title} ({s.category})
                  </option>
                ))}
                <option value="General Collaboration / Other">General Collaboration / Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="details" className="block font-mono text-xs text-bone/70">
                Project Details & Timeline
              </label>
              <textarea
                id="details"
                rows={4}
                required
                placeholder="Briefly describe the genre, reference tracks, stems needed, and target release date…"
                value={inquiryDetails}
                onChange={(e) => setInquiryDetails(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-bone/20 bg-ink/80 px-4 py-2.5 font-mono text-xs text-bone placeholder:text-bone/40 focus:border-cyan focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                className="rounded-full bg-bone px-8 py-3 font-mono text-xs font-bold text-ink transition hover:bg-cyan hover:shadow-[0_0_20px_rgba(95,212,255,0.4)]"
              >
                SEND DIRECT INQUIRY
              </button>

              {submitted && (
                <span className="font-mono text-xs text-cyan">
                  ✓ Inquiry mail client prepared. Check your email composer!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

