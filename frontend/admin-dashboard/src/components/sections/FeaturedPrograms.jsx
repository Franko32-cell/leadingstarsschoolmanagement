import Container from '../common/Container';
import ProgramCard from '../cards/ProgramCard';

const programs = [
  { title: 'Preschool', desc: 'A warm introduction to school life through play, routine, and early discovery.', link: '/academics/preschool' },
  { title: 'Nursery', desc: 'Foundational literacy, numeracy, and school readiness in a nurturing setting.', link: '/academics/nursery' },
  { title: 'Primary', desc: 'Strong academic grounding with attention to reading, mathematics, and science.', link: '/academics/primary' },
  { title: 'Junior High', desc: 'Structured preparation for higher academic success and responsible adolescence.', link: '/academics/junior-high' },
];

const FeaturedPrograms = () => (
  <section className='py-20'>
    <Container>
      <h2 className='mb-10 font-display text-4xl font-black text-navy'>Our programmes</h2>
      <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
        {programs.map((p) => <ProgramCard key={p.title} {...p} />)}
      </div>
    </Container>
  </section>
);

export default FeaturedPrograms;
