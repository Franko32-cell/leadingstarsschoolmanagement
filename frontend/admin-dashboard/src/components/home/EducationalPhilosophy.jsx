export default function EducationalPhilosophy() {
  const pillars = [
    {
      title: 'Academic Rigour',
      body: 'Our curriculum exceeds national standards, combining the Ghanaian Standards-Based Curriculum with internationally informed best practice. Every lesson is designed to develop genuine understanding, not surface memorisation.',
    },
    {
      title: 'Character Formation',
      body: 'We believe a successful education shapes character as deliberately as it shapes the intellect. Honesty, perseverance, kindness, and respect are taught not as slogans but as daily expectations.',
    },
    {
      title: 'Whole-Child Development',
      body: 'Music, art, sport, and creative expression are not extras at Leading Stars. They are essential parts of a complete education, woven into every week from preschool onward.',
    },
    {
      title: 'Partnership With Parents',
      body: 'A child flourishes when home and school work as one. We invest deliberately in transparent communication, parent workshops, and an open-door culture that keeps families closely informed.',
    },
  ];

  return (
    <section className="py-24 bg-white" aria-labelledby="philosophy-heading">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <span className="text-amber-700 font-medium text-sm tracking-wider uppercase">
            Our Approach
          </span>
          <h2
            id="philosophy-heading"
            className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mt-3 mb-6"
          >
            An education built on four enduring principles
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            For over two decades, Leading Stars Academy has built a reputation for
            an education that is academically serious, deeply caring, and rooted in
            values that last a lifetime. Our philosophy rests on four pillars that
            shape every classroom, every lesson, and every interaction.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {pillars.map((p, i) => (
            <div key={p.title} className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center font-serif font-bold text-amber-800 text-lg">
                {i + 1}
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">
                  {p.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}