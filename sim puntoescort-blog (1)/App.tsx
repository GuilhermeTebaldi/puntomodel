
import React, { useState, useEffect } from 'react';
import { Page, BlogPost } from './types';
import { BLOG_POSTS, Logo } from './constants';
import { GoogleGenAI } from "@google/genai";

// Components
const Navbar: React.FC<{ onNavigate: (p: Page) => void }> = ({ onNavigate }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex items-center justify-between">
      <div className="cursor-pointer" onClick={() => onNavigate(Page.BLOG)}>
        <Logo />
      </div>
      
      <div className="flex items-center gap-8 text-sm font-medium">
        <button 
          onClick={() => onNavigate(Page.BLOG)}
          className="text-punto-red font-bold transition-colors hover:text-red-700 uppercase tracking-widest text-xs"
        >
          Blog
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* ENTRAR button removed as requested */}
      </div>
    </nav>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-gray-50 py-12 px-6 border-t border-gray-200 mt-20">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
      <div>
        <Logo />
      </div>
      <div className="text-sm text-gray-400">
        &copy; 2024 Puntoescort. Conteúdo exclusivo e lifestyle.
      </div>
      <div className="flex gap-6 text-sm font-medium text-gray-500">
        <span className="hover:text-punto-red cursor-pointer">Privacidade</span>
        <span className="hover:text-punto-red cursor-pointer">Termos</span>
        <span className="hover:text-punto-red cursor-pointer">Contato</span>
      </div>
    </div>
  </footer>
);

const BlogSection: React.FC<{ onPostClick: (post: BlogPost) => void }> = ({ onPostClick }) => {
  const [activeCategory, setActiveCategory] = useState('Tudo');
  const categories = ['Tudo', 'Cidades', 'Modelos', 'Estilo de Vida', 'Segurança'];
  
  const filteredPosts = activeCategory === 'Tudo' 
    ? BLOG_POSTS 
    : BLOG_POSTS.filter(post => post.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-bold mb-4">Blog Puntoescort</h2>
          <p className="text-gray-500">Dicas, guias e novidades do universo lifestyle.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full border text-sm transition-all ${
                    activeCategory === cat 
                    ? 'bg-punto-red border-punto-red text-white' 
                    : 'border-gray-200 text-gray-600 hover:border-punto-red hover:text-punto-red'
                  }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map(post => (
          <article 
            key={post.id} 
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col"
            onClick={() => onPostClick(post)}
          >
            <div className="relative overflow-hidden aspect-video">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-punto-red uppercase tracking-wider">
                {post.category}
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <p className="text-xs text-gray-400 mb-2">{post.date}</p>
              <h3 className="text-xl font-bold mb-3 group-hover:text-punto-red transition-colors leading-snug">
                {post.title}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-grow">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-2 text-punto-red text-sm font-bold mt-auto">
                Ler mais 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const ArticleView: React.FC<{ post: BlogPost, onBack: () => void }> = ({ post, onBack }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateAIPerspective = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Como um consultor de estilo de vida e viagens de luxo, forneça um comentário curto (máximo 150 palavras) e elegante em português sobre o seguinte tema de blog: "${post.title}". Foco em sofisticação e discrição.`,
      });
      setInsight(response.text || "Insight não disponível no momento.");
    } catch (error) {
      console.error(error);
      setInsight("Desculpe, não foi possível carregar a perspectiva inteligente agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateAIPerspective();
    window.scrollTo(0, 0);
  }, [post]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-punto-red mb-8 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Voltar para o Blog
      </button>

      <div className="mb-12">
        <div className="flex gap-2 mb-4">
           <span className="text-punto-red font-bold text-sm uppercase tracking-widest">{post.category}</span>
           <span className="text-gray-300">•</span>
           <span className="text-gray-500 text-sm">{post.date}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-8 leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 mb-8">
           <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
             <img src={`https://picsum.photos/seed/${post.author}/100`} alt={post.author} />
           </div>
           <div>
             <p className="font-bold">{post.author}</p>
             <p className="text-xs text-gray-500">Editor Puntoescort</p>
           </div>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden mb-12 shadow-2xl">
        <img src={post.imageUrl} alt={post.title} className="w-full h-auto" />
      </div>

      <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
        <p className="text-xl font-medium text-gray-900">{post.excerpt}</p>
        <p>{post.content}</p>
        <p>A Puntoescort se orgulha de oferecer não apenas uma plataforma, mas uma curadoria completa de conteúdo para elevar o nível da sua experiência social e pessoal.</p>
        <p>Continue acompanhando nosso blog para mais novidades exclusivas, guias de viagem e as tendências mais quentes do mercado de luxo no Brasil.</p>
      </div>

      {/* AI Insight Section - Reverted to Light Style */}
      <div className="mt-16 bg-gray-50 border border-gray-100 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
           <span className="bg-punto-red/10 text-punto-red text-[10px] font-black uppercase px-2 py-1 rounded">Smart Insight</span>
        </div>
        <div className="flex items-start gap-4">
           <div className="bg-punto-red w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
           </div>
           <div>
              <h4 className="font-bold text-lg mb-2">Perspectiva Inteligente</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-punto-red border-t-transparent"></div>
                  <span>Gerando insight exclusivo...</span>
                </div>
              ) : (
                <p className="text-gray-600 italic leading-relaxed">"{insight}"</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.BLOG);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const openArticle = (post: BlogPost) => {
    setSelectedPost(post);
    setCurrentPage(Page.ARTICLE);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white selection:bg-punto-red selection:text-white">
      <Navbar onNavigate={navigateTo} />
      
      <main className="flex-grow">
        {currentPage === Page.BLOG && (
          <BlogSection onPostClick={openArticle} />
        )}

        {currentPage === Page.ARTICLE && selectedPost && (
          <ArticleView post={selectedPost} onBack={() => navigateTo(Page.BLOG)} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
