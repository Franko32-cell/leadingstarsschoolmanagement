import { useState } from "react";
import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";

const ContactPage = () => {
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
    <>
      <SEO
        title="Contact Us"
        description="Contact Leading Stars Academy in Accra for admissions, programme information, school visits, and general enquiries."
        url="/contact"
      />
      <PageHeader
        eyebrow="Get In Touch"
        title="We would be glad to hear from you"
        description="Contact our school for admissions enquiries, programme details, school visits, or general support."
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="space-y-5 text-slate-700">
                <p><strong>Address:</strong> Tettegu Junction, Behind Frimps Fueling Station, Accra</p>
                <p><strong>Phone:</strong> 0249 878 954 / 0547 014 953</p>
                <p><strong>Email:</strong> info@leadingstarsacademy.edu.gh</p>
                <p><strong>School Hours:</strong> Mon – Fri, 7:30 AM – 4:30 PM</p>
              </div>

              <div className="mt-8 overflow-hidden rounded-3xl border">
                <iframe
                  title="Leading Stars Academy map"
                  src="https://www.google.com/maps?q=Tettegu%20Junction%20Accra&output=embed"
                  className="h-[360px] w-full"
                  loading="lazy"
                />
              </div>
            </div>

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
          </div>
        </Container>
      </section>
    </>
  );
};

export default ContactPage;