import { Link } from 'react-router-dom';

const ProgramCard = ({ title, desc, link }) => (
  <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg'>
    <h2 className='font-display text-2xl font-bold text-navy'>{title}</h2>
    <p className='mt-3 text-sm leading-7 text-slate-600'>{desc}</p>
    <Link to={link} className='mt-4 inline-block font-semibold text-gold'>
      Explore programme →
    </Link>
  </div>
);

export default ProgramCard;
