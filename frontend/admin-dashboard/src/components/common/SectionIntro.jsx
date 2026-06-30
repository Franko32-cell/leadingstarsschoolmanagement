const SectionIntro = ({ eyebrow, title, description }) => (
  <div className='mb-10 max-w-2xl'>
    {eyebrow && (
      <p className='mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold'>{eyebrow}</p>
    )}
    <h2 className='font-display text-4xl font-black text-navy'>{title}</h2>
    {description && <p className='mt-4 text-base leading-8 text-slate-600'>{description}</p>}
  </div>
);

export default SectionIntro;
