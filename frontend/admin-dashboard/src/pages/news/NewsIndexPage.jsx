// NewsIndexPage.jsx
import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import { newsPosts } from "../../data/newsPosts";
import { Calendar, Clock, ArrowRight, Newspaper } from "lucide-react"; // Add lucide-react if available, or use SVGs

const NewsIndexPage = () => {
  // Sort posts by date (newest first) and separate featured post
  const sortedPosts = [...newsPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const featuredPost = sortedPosts[0];
  const remainingPosts = sortedPosts.slice(1);

  // Helper to format dates nicely
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Estimate reading time
  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    const wordCount = content?.replace(/<[^>]*>/g, '').split(/\s+/).length || 0;
    return Math.ceil(wordCount / wordsPerMinute) || 3;
  };

  return (
    <>
      <SEO
        title="School News & Stories"
        description="Discover the latest achievements, events, and updates from the Leading Stars Academy community. Stories that inspire, inform, and connect."
        url="/news"
      />
      
      <PageHeader
        eyebrow="Stories That Matter"
        title="News from our community"
        description="Celebrating achievements, sharing moments of joy, and keeping you connected to the heartbeat of our school."
      />

      <section className="py-16 bg-slate-50">
        <Container>
          {/* Featured Post - Hero Section */}
          {featuredPost && (
            <div className="mb-16">
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gold">
                <Newspaper className="w-4 h-4" />
                <span className="uppercase tracking-wider">Latest Story</span>
              </div>
              
              <article className="relative overflow-hidden rounded-3xl bg-white shadow-xl lg:flex lg:min-h-[500px]">
                <div className="lg:w-1/2 relative">
                  <img 
                    src={featuredPost.image} 
                    alt={featuredPost.title} 
                    className="h-64 w-full object-cover lg:h-full"
                    loading="eager"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-navy bg-gold/90 rounded-full backdrop-blur-sm">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>
                
                <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(featuredPost.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {getReadingTime(featuredPost.content)} min read
                    </span>
                  </div>
                  
                  <h2 className="font-display text-3xl lg:text-4xl font-bold text-navy mb-4 leading-tight">
                    <Link to={`/news/${featuredPost.slug}`} className="hover:text-gold transition-colors">
                      {featuredPost.title}
                    </Link>
                  </h2>
                  
                  <p className="text-lg text-slate-600 leading-relaxed mb-8">
                    {featuredPost.excerpt}
                  </p>
                  
                  <div>
                    <Link 
                      to={`/news/${featuredPost.slug}`} 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-white rounded-full font-semibold hover:bg-gold transition-colors group"
                    >
                      Read Full Story
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          )}

          {/* Grid of Remaining Posts */}
          {remainingPosts.length > 0 && (
            <div>
              <h3 className="font-display text-2xl font-bold text-navy mb-8 flex items-center gap-2">
                More Stories 
                <span className="text-slate-400 font-normal text-lg">({remainingPosts.length})</span>
              </h3>
              
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {remainingPosts.map((post) => (
                  <article 
                    key={post.slug} 
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden h-56">
                      <img 
                        src={post.image} 
                        alt={post.title} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        loading="lazy" 
                      />
                      <div className="absolute top-3 left-3">
                        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-navy bg-white/95 rounded-full shadow-sm">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-grow p-6">
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(post.date)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {getReadingTime(post.content)} min
                        </span>
                      </div>

                      <h2 className="font-display text-xl font-bold text-navy mb-3 line-clamp-2 group-hover:text-gold transition-colors">
                        <Link to={`/news/${post.slug}`}>{post.title}</Link>
                      </h2>
                      
                      <p className="text-sm leading-relaxed text-slate-600 line-clamp-3 mb-4 flex-grow">
                        {post.excerpt}
                      </p>
                      
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">By {post.author}</span>
                        <Link 
                          to={`/news/${post.slug}`} 
                          className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-navy transition-colors"
                        >
                          Read 
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {newsPosts.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Newspaper className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-navy mb-2">No stories yet</h3>
              <p className="text-slate-600">Check back soon for updates from our school community.</p>
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default NewsIndexPage;