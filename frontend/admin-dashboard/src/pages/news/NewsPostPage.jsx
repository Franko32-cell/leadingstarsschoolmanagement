import { Navigate, useParams } from 'react-router-dom';
import SEO from '../../seo/SEO';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Prose from '../../components/common/Prose';
import { newsPosts } from '../../data/newsPosts';
import { articleSchema, breadcrumbSchema } from '../../seo/schemas';

const NewsPostPage = () => {
  const { slug } = useParams();
  const post = newsPosts.find((item) => item.slug === slug);


  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.image}
        url={'/news/' + post.slug}
        type='article'
        schema={[
          articleSchema(post),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'News', path: '/news' },
            { name: post.title, path: '/news/' + post.slug },
          ]),
        ]}
      />
      <PageHeader eyebrow={post.category} title={post.title} description={post.excerpt} />
      <section className='py-16'>
        <Container className='max-w-4xl'>
          <img src={post.image} alt={post.title} className='mb-8 h-[420px] w-full rounded-3xl object-cover shadow-xl' />
          <div className='mb-8 text-sm text-slate-500'>{post.author} • {post.date}</div>
          <Prose>
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default NewsPostPage;
