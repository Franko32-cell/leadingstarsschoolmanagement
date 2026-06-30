import { Link } from 'react-router-dom';
import Container from '../common/Container';

const CTASection = () => (
  <section className='bg-navy py-20 text-white'>
    <Container className='text-center'>
      <h2 className='font-display text-4xl font-black'>Ready to begin your child's journey with us?</h2>
      <p className='mx-auto mt-6 max-w-2xl text-base leading-8 text-white/75'>
        We welcome families who value quality teaching, purposeful structure, and whole-child development.
      </p>
      <div className='mt-8 flex justify-center gap-4'>
        <Link to='/admissions' className='rounded-full bg-gold px-6 py-3 font-bold text-navy'>
          View admissions process
        </Link>
        <Link to='/contact' className='rounded-full border border-white/30 px-6 py-3 font-semibold text-white'>
          Contact our team
        </Link>
      </div>
    </Container>
  </section>
);

export default CTASection;
