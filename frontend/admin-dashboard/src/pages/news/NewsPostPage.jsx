// NewsPostPage.jsx
import { Navigate, useParams, Link } from 'react-router-dom';
import SEO from '../../seo/SEO';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import Prose from '../../components/common/Prose';
import { newsPosts } from '../../data/newsPosts';
import { articleSchema, breadcrumbSchema } from '../../seo/schemas';
import { Calendar, Clock, User, ArrowLeft, Share2, ChevronRight } from "lucide-react";

const NewsPostPage = () => {
  const { slug } = useParams();
  const post = newsPosts.find((item) => item.slug === slug);
  
  // Handle 404
  if (!post) {
    return <Navigate to="/news" replace />;
  }

  // Get related posts (same category, excluding current)
  const relatedPosts = newsPosts
    .filter(item => item.category === post.category && item.slug !== post.slug)
    .slice(0, 3);

  // Get prev/next posts
  const currentIndex = newsPosts.findIndex(item => item.slug === slug);
  const prevPost = currentIndex > 0 ? newsPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < newsPosts.length - 1 ? newsPosts[currentIndex + 1] : null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content?.replace(/<[^>]*>/g, '').split(/\s+/).length || 0;
    return Math.ceil(wordCount / wordsPerMinute) || 3;
  };

  return (
    <>
      <SEO
        title={`${post.title} | Leading Stars Academy`}
        description={post.excerpt}
        image={post.image}
        url={`/news/${post.slug}`}
        type='article'
        schema={[
          articleSchema(post),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'News', path: '/news' },
            { name: post.title, path: `/news/${post.slug}` },
          ]),
        ]}
      />

      {/* Breadcrumb Navigation */}
      <div className="bg-slate-50 border-b border-slate-200">
        <Container className="py-4">
          <nav className="flex items-center gap-2 text-sm text-slate-600">
            <Link to="/" className="hover:text-gold transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/news" className="hover:text-gold transition-colors">News</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-navy font-medium truncate max-w-[200px] sm:max-w-md">{post.title}</span>
          </nav>
        </Container>
      </div>

      <article>
        <PageHeader 
          eyebrow={post.category} 
          title={post.title} 
          description={post.excerpt}
          className="pb-8"
        />

        <section className='pb-16'>
          <Container className='max-w-4xl'>
            {/* Meta Info Bar */}
            <div className="flex flex-wrap items-center gap-6 mb-8 px-4 py-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Written by</p>
                  <p className="font-semibold text-navy">{post.author}</p>
                </div>
              </div>
              
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gold" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gold" />
                  {getReadingTime(post.content)} min read
                </span>
              </div>
              {/* Share Buttons */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Share</span>
                <button
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-blue-600 hover:text-white transition-all"
                  onClick={() => window.open('https://www.facebook.com/sharer/sharer.php?u=' + window.location.href)}
                  aria-label="Share on Facebook"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-sky-500 hover:text-white transition-all"
                  onClick={() => window.open('https://twitter.com/intent/tweet?url=' + window.location.href)}
                  aria-label="Share on Twitter"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Featured Image */}
            <div className="relative mb-12">
              <img 
                src={post.image} 
                alt={post.title} 
                className='w-full rounded-3xl object-cover shadow-2xl max-h-[500px]' 
              />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy/20 to-transparent rounded-b-3xl" />
            </div>

            {/* Content */}
            <Prose className="prose-lg">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </Prose>

            {/* Tags/Categories */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-navy mr-2">Posted in:</span>
                <span className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-gold hover:text-navy transition-colors cursor-pointer">
                  {post.category}
                </span>
              </div>
            </div>

            {/* Author Box */}
            <div className="mt-12 p-8 bg-slate-50 rounded-3xl border border-slate-200">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <h4 className="font-display text-lg font-bold text-navy mb-1">{post.author}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Part of the Leading Stars Academy communications team, dedicated to sharing 
                    the stories and achievements of our vibrant school community.
                  </p>
                </div>
              </div>
            </div>

            {/* Prev/Next Navigation */}
            <div className="mt-12 grid md:grid-cols-2 gap-4">
              {prevPost && (
                <Link 
                  to={`/news/${prevPost.slug}`}
                  className="group p-6 rounded-2xl border border-slate-200 hover:border-gold hover:shadow-lg transition-all text-left"
                >
                  <span className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">← Previous Story</span>
                  <h5 className="font-display font-bold text-navy group-hover:text-gold transition-colors line-clamp-2">
                    {prevPost.title}
                  </h5>
                </Link>
              )}
              {nextPost && (
                <Link 
                  to={`/news/${nextPost.slug}`}
                  className={`group p-6 rounded-2xl border border-slate-200 hover:border-gold hover:shadow-lg transition-all text-left ${!prevPost ? 'md:col-start-2' : ''}`}
                >
                  <span className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Next Story →</span>
                  <h5 className="font-display font-bold text-navy group-hover:text-gold transition-colors line-clamp-2">
                    {nextPost.title}
                  </h5>
                </Link>
              )}
            </div>

            {/* Back to News */}
            <div className="mt-12 text-center">
              <Link 
                to="/news" 
                className="inline-flex items-center gap-2 text-slate-600 hover:text-gold transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to all stories
              </Link>
            </div>
          </Container>
        </section>

        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <section className="py-16 bg-slate-50 border-t border-slate-200">
            <Container>
              <h3 className="font-display text-2xl font-bold text-navy mb-8 text-center">
                More in {post.category}
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map(related => (
                  <Link 
                    key={related.slug} 
                    to={`/news/${related.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={related.image} 
                        alt={related.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <h4 className="font-display font-bold text-navy mb-2 group-hover:text-gold transition-colors line-clamp-2">
                        {related.title}
                      </h4>
                      <p className="text-sm text-slate-500">{formatDate(related.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        )}
      </article>
    </>
  );
};

export default NewsPostPage;