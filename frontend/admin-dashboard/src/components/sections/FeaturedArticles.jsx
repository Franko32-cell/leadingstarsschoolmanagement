import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { blogPosts } from '../../data/blogPosts';
import ArticleCard from '../cards/ArticleCard';

const FeaturedArticles = () => {
  const featured = blogPosts.slice(0, 3);
  return (
    <section className='py-20'>
      <Container>
        <div className='mb-10 flex items-end justify-between gap-6'>
          <h2 className='font-display text-4xl font-black text-navy'>Helpful reading for parents</h2>
          <Link to='/blog' className='font-semibold text-gold'>Visit blog →</Link>
        </div>
        <div className='grid gap-8 lg:grid-cols-3'>
          {featured.map((post) => <ArticleCard key={post.slug} post={post} />)}
        </div>
      </Container>
    </section>
  );
};

export default FeaturedArticles;
