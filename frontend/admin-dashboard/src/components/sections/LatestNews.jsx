import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { newsPosts } from '../../data/newsPosts';
import NewsCard from '../cards/NewsCard';

const LatestNews = () => {
  const latest = newsPosts.slice(0, 3);
  return (
    <section className='bg-cream py-20'>
      <Container>
        <div className='mb-10 flex items-end justify-between gap-6'>
          <h2 className='font-display text-4xl font-black text-navy'>Recent updates</h2>
          <Link to='/news' className='font-semibold text-gold'>View all news →</Link>
        </div>
        <div className='grid gap-8 lg:grid-cols-3'>
          {latest.map((post) => <NewsCard key={post.slug} post={post} />)}
        </div>
      </Container>
    </section>
  );
};

export default LatestNews;
