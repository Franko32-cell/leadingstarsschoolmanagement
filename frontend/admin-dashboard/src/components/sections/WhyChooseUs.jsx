import Container from '../common/Container';

const points = [
  'Small enough to know students personally, structured enough to maintain high standards.',
  'Strong literacy, numeracy, and foundational STEM teaching from the early years.',
  'Emphasis on discipline, courtesy, leadership, and personal responsibility.',
  'A balanced programme that values arts, sports, technology, and communication.',
  'Ongoing partnership with parents through clear school-home communication.',
];

const WhyChooseUs = () => (
  <section className='py-20'>
    <Container>
      <h2 className='mb-8 font-display text-4xl font-black text-navy'>Why families choose our school</h2>
      <ul className='space-y-4'>
        {points.map((p, i) => (
          <li key={i} className='flex gap-3 text-base leading-7 text-slate-700'>
            <span className='mt-1 text-gold'>•</span> {p}
          </li>
        ))}
      </ul>
    </Container>
  </section>
);

export default WhyChooseUs;
