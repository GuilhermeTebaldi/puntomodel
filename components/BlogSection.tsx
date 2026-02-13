import React, { useMemo, useState } from 'react';
import { useI18n } from '../translations/i18n';

type CategoryKey = 'cities' | 'lifestyle' | 'models' | 'safety';

type BlogPostBase = {
  id: string;
  category: CategoryKey;
  imageUrl: string;
};

type BlogPostView = BlogPostBase & {
  title: string;
  excerpt: string;
  content: string;
  date: string;
};

const BLOG_POSTS: BlogPostBase[] = [
  {
    id: 'citiesSaoPaulo',
    category: 'cities',
    imageUrl: 'https://picsum.photos/seed/saopaulo/800/500',
  },
  {
    id: 'citiesRio',
    category: 'cities',
    imageUrl: 'https://picsum.photos/seed/riodejaneiro/800/500',
  },
  {
    id: 'lifestyleEtiquette',
    category: 'lifestyle',
    imageUrl: 'https://picsum.photos/seed/lifestyle/800/500',
  },
  {
    id: 'lifestylePlanning',
    category: 'lifestyle',
    imageUrl: 'https://picsum.photos/seed/elegance/800/500',
  },
  {
    id: 'modelsProfile',
    category: 'models',
    imageUrl: 'https://picsum.photos/seed/profile/800/500',
  },
  {
    id: 'modelsPhotos',
    category: 'models',
    imageUrl: 'https://picsum.photos/seed/photos/800/500',
  },
  {
    id: 'safetyAlerts',
    category: 'safety',
    imageUrl: 'https://picsum.photos/seed/safety/800/500',
  },
  {
    id: 'safetyPrivacy',
    category: 'safety',
    imageUrl: 'https://picsum.photos/seed/privacy/800/500',
  },
];

const ACCENT = '#e3262e';

const BlogSection: React.FC = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<'all' | CategoryKey>('all');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const categories = useMemo(
    () => [
      { key: 'all', label: t('blog.categories.all') },
      { key: 'cities', label: t('blog.categories.cities') },
      { key: 'lifestyle', label: t('blog.categories.lifestyle') },
      { key: 'models', label: t('blog.categories.models') },
      { key: 'safety', label: t('blog.categories.safety') },
    ],
    [t]
  );

  const posts = useMemo<BlogPostView[]>(
    () =>
      BLOG_POSTS.map((post) => ({
        ...post,
        title: t(`blog.posts.${post.id}.title`),
        excerpt: t(`blog.posts.${post.id}.excerpt`),
        content: t(`blog.posts.${post.id}.content`),
        date: t(`blog.posts.${post.id}.date`),
      })),
    [t]
  );

  const filteredPosts =
    activeCategory === 'all'
      ? posts
      : posts.filter((post) => post.category === activeCategory);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  return (
    <>
      <section id="blog" className="bg-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#e3262e] font-black">
                {t('blog.eyebrow')}
              </p>
              <h2 className="text-3xl md:text-4xl font-black mb-3">{t('blog.title')}</h2>
              <p className="text-gray-500">{t('blog.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key as 'all' | CategoryKey)}
                  className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest transition-all ${
                    activeCategory === category.key
                      ? 'bg-[#e3262e] border-[#e3262e] text-white'
                      : 'border-gray-200 text-gray-600 hover:border-[#e3262e] hover:text-[#e3262e]'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col"
                onClick={() => setSelectedPostId(post.id)}
              >
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-[#e3262e] uppercase tracking-widest">
                    {t(`blog.categories.${post.category}`)}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <p className="text-xs text-gray-400 mb-2">{post.date}</p>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-[#e3262e] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-grow">{post.excerpt}</p>
                  <div className="flex items-center gap-2 text-[#e3262e] text-sm font-bold mt-auto">
                    {t('blog.readMore')}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {selectedPost && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-start justify-center px-4 py-10 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl">
            <button
              onClick={() => setSelectedPostId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold"
            >
              {t('common.close')}
            </button>

            <div className="p-6 md:p-10">
              <button
                onClick={() => setSelectedPostId(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-[#e3262e] mb-8 transition-colors text-sm font-bold uppercase tracking-wider"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('blog.backToBlog')}
              </button>

              <div className="mb-10">
                <div className="flex gap-2 mb-4 items-center">
                  <span className="text-[#e3262e] font-bold text-xs uppercase tracking-widest">
                    {t(`blog.categories.${selectedPost.category}`)}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500 text-xs">{selectedPost.date}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">{selectedPost.title}</h1>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${t('blog.author')}/100`}
                      alt={t('blog.author')}
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="font-bold">{t('blog.author')}</p>
                    <p className="text-xs text-gray-500">{t('blog.editorLabel')}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl overflow-hidden mb-10 shadow-xl">
                <img src={selectedPost.imageUrl} alt={selectedPost.title} className="w-full h-auto" />
              </div>

              <div className="text-gray-700 leading-relaxed space-y-6">
                <p className="text-lg font-semibold text-gray-900">{selectedPost.excerpt}</p>
                <p>{selectedPost.content}</p>
                <p>{t('blog.articleOutro1')}</p>
                <p>{t('blog.articleOutro2')}</p>
              </div>

              <div className="mt-12 bg-gray-50 border border-gray-100 rounded-3xl p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#e3262e] mb-2">
                      {t('blog.curatedLabel')}
                    </p>
                    <p className="text-sm text-gray-600">{t('blog.curatedBody')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlogSection;
