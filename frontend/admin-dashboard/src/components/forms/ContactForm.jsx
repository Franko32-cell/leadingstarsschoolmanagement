import { useState } from "react";

const ContactForm = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      {sent ? (
        <div>
          <h2 className="font-display text-3xl font-bold text-navy">Message sent</h2>
          <p className="mt-4 text-slate-600">
            Thank you for contacting Leading Stars Academy. Our team will respond as soon as possible.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <h2 className="font-display text-3xl font-bold text-navy">Send us a message</h2>
          <input
            name="name"
            placeholder="Full name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-gold"
          />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-gold"
          />
          <input
            name="phone"
            placeholder="Phone number"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-gold"
          />
          <textarea
            name="message"
            rows="6"
            placeholder="Your message"
            required
            value={form.message}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-gold"
          />
          <button
            type="submit"
            className="rounded-full bg-navy px-6 py-3 font-bold text-white"
          >
            Send Message
          </button>
        </form>
      )}
    </div>
  );
};

export default ContactForm;