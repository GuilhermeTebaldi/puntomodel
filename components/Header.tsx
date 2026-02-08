
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  Bell, 
  ChevronDown, 
  Menu, 
  X, 
  User, 
  LogIn,
  LogOut,
  Instagram,
  Facebook,
  Twitter,
  Music,
  Send,
  Play,
  LayoutDashboard,
  CheckCircle2,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import Logo from './Logo';
import { useI18n } from '../translations/i18n';

interface HeaderProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  currentUser: { name: string; role: string } | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  hasProfile?: boolean;
  onOpenDashboard?: () => void;
  savedOnlineModels?: Array<{ id: string; name: string }>;
}

const Header: React.FC<HeaderProps> = ({ onLoginClick, onRegisterClick, currentUser, onLogout, onOpenProfile, hasProfile, onOpenDashboard, savedOnlineModels }) => {
  const { language, setLanguage, t, languageOptions } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const languageRefDesktop = useRef<HTMLDivElement>(null);
  const languageRefMobile = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleNotifications = () => setIsNotificationsOpen(!isNotificationsOpen);
  
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const toggleFlag = () => {
    setIsLangOpen((prev) => !prev);
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      const target = event.target as Node;
      const insideDesktop = languageRefDesktop.current && languageRefDesktop.current.contains(target);
      const insideMobile = languageRefMobile.current && languageRefMobile.current.contains(target);
      if (!insideDesktop && !insideMobile) setIsLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseNotifications = currentUser ? [
    {
      id: 1,
      icon: <MessageCircle className="text-blue-500" size={18} />,
      title: t('header.notificationNewMessageTitle'),
      desc: t('header.notificationNewMessageDesc'),
      time: t('header.notificationNow'),
    },
  ] : [];

  const savedNotifications = (savedOnlineModels || []).map((model) => ({
    id: `saved-${model.id}`,
    icon: <CheckCircle2 className="text-green-500" size={18} />,
    title: t('header.savedOnlineTitle', { name: model.name }),
    desc: t('header.savedOnlineDesc', { name: model.name }),
    time: t('header.notificationNow'),
  }));

  const notifications = [...baseNotifications, ...savedNotifications];

  const FlagButton = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="relative" ref={isMobile ? languageRefMobile : languageRefDesktop} data-lang-menu>
      <button 
        onClick={(event) => {
          event.stopPropagation();
          toggleFlag();
        }}
        className={`flex items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors ${isMobile ? '' : ''}`}
        title={t('language.select')}
      >
        <img 
          src={`https://flagcdn.com/w20/${language}.png`} 
          alt={language.toUpperCase()} 
          className="w-5 h-auto rounded-sm shadow-sm"
        />
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {isLangOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[120]">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={(event) => {
                event.stopPropagation();
                setLanguage(lang.code);
                setIsLangOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                language === lang.code ? 'text-[#e3262e] font-bold' : 'text-gray-700'
              }`}
            >
              <img
                src={`https://flagcdn.com/w20/${lang.code}.png`}
                alt={lang.label}
                className="w-5 h-auto rounded-sm shadow-sm"
              />
              <span className="font-semibold">{lang.label}</span>
              {language === lang.code && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          {/* Mobile Menu Button (Hamburger) */}
          <button 
            onClick={toggleMenu}
            className="p-2 -ml-2 text-gray-700 md:hidden focus:outline-none"
            aria-label="Menu"
          >
            <Menu size={28} />
          </button>

          <div className="flex-1 md:flex-initial flex justify-center md:justify-start">
            <Logo />
          </div>
          
          <div className="flex items-center gap-2 md:gap-8">
            {currentUser ? (
              <div className="hidden md:flex items-center gap-3">
                {currentUser.role === 'admin' && (
                  <a
                    href="/admin"
                    className="text-xs font-bold uppercase tracking-widest text-[#e3262e] border border-[#e3262e]/40 px-3 py-2 rounded-full hover:bg-red-50"
                  >
                    {t('common.admin')}
                  </a>
                )}
                {currentUser.role === 'model' && (
                  <button
                    onClick={onOpenDashboard}
                    className="text-xs font-bold uppercase tracking-widest text-[#e3262e] border border-[#e3262e]/40 px-3 py-2 rounded-full hover:bg-red-50"
                  >
                    {t('header.dashboard')}
                  </button>
                )}
                {currentUser.role === 'model' && hasProfile && (
                  <button
                    onClick={onOpenProfile}
                    className="text-xs font-bold uppercase tracking-widest text-gray-600 border border-gray-200 px-3 py-2 rounded-full hover:text-[#e3262e] hover:border-[#e3262e]/40"
                  >
                    {t('header.myProfile')}
                  </button>
                )}
                <span className="text-sm font-bold text-gray-700">{t('header.hello', { name: currentUser.name })}</span>
                <button
                  onClick={onLogout}
                  className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#e3262e]"
                >
                  {t('common.logout')}
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={onRegisterClick}
                  className="hidden md:flex items-center gap-1 text-[#e3262e] font-bold text-sm uppercase tracking-wide hover:opacity-80 transition-opacity"
                >
                  {t('common.registerFree')}
                  <ChevronRight size={18} />
                </button>
                
                <button 
                  onClick={onLoginClick}
                  className="hidden md:flex items-center gap-1 font-bold text-sm uppercase tracking-wide hover:text-[#e3262e] transition-colors"
                >
                  {t('common.login')}
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            <div className="flex items-center gap-3 sm:gap-4 border-l md:pl-4 border-gray-200 relative">
              <FlagButton />
              
              <div className="relative" ref={notificationRef}>
                <button onClick={toggleNotifications} className="block focus:outline-none">
                  <Bell size={20} className={`cursor-pointer transition-colors ${isNotificationsOpen ? 'text-[#e3262e]' : 'text-gray-700'}`} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold animate-pulse">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[110] transform origin-top-right transition-all">
                    <div className="bg-[#e3262e] p-4 text-white flex justify-between items-center">
                      <span className="font-bold">{t('header.notifications')}</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{t('header.notificationsRecent')}</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="p-4 text-sm text-gray-500">{t('header.notificationsEmpty')}</div>
                      )}
                      {notifications.map((n) => (
                        <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3">
                          <div className="mt-1">{n.icon}</div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                            <p className="text-[10px] text-gray-400 mt-2">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {notifications.length > 0 && (
                      <button className="w-full py-3 text-center text-sm font-bold text-[#e3262e] bg-gray-50 hover:bg-gray-100 transition-colors">
                        {t('header.notificationsSeeAll')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={toggleMenu} />
        
        {/* Sidebar content */}
        <div className={`absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#eef2f3] transform transition-transform duration-300 ease-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Menu Header */}
          <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 h-16">
            <button onClick={toggleMenu} className="text-gray-700">
              <X size={24} />
            </button>
            <Logo />
            <div className="flex items-center gap-3">
              <FlagButton isMobile={true} />
              <div className="relative">
                <button onClick={() => { setIsNotificationsOpen(true); setIsMenuOpen(false); }}>
                  <Bell size={22} className="text-gray-700" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {notifications.length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="mt-4 px-4 flex flex-col gap-px bg-gray-200 shadow-inner">
            {currentUser ? (
              <>
                <div className="bg-white px-4 py-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {t('header.hello', { name: currentUser.name })}
                  </p>
                </div>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => {
                      navigateTo('/admin');
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-between bg-white px-4 py-5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-[#e3262e]">
                        <ShieldCheck size={22} />
                      </div>
                      <span className="text-[#e3262e] font-extrabold text-lg uppercase">{t('common.admin')}</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-800" />
                  </button>
                )}
                {currentUser.role === 'model' && onOpenDashboard && (
                  <button
                    onClick={() => {
                      onOpenDashboard();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-between bg-white px-4 py-5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-[#e3262e]">
                        <LayoutDashboard size={22} />
                      </div>
                      <span className="text-[#e3262e] font-extrabold text-lg uppercase">{t('header.dashboard')}</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-800" />
                  </button>
                )}
                {currentUser.role === 'model' && hasProfile && onOpenProfile && (
                  <button
                    onClick={() => {
                      onOpenProfile();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-between bg-white px-4 py-5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-gray-800">
                        <User size={22} />
                      </div>
                      <span className="text-gray-800 font-extrabold text-lg uppercase">{t('header.myProfile')}</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-800" />
                  </button>
                )}
                <button
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-between bg-white px-4 py-5 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-gray-800">
                      <LogOut size={22} />
                    </div>
                    <span className="text-gray-800 font-extrabold text-lg uppercase">{t('common.logout')}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-800" />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { onRegisterClick(); setIsMenuOpen(false); }}
                  className="flex items-center justify-between bg-white px-4 py-5 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-[#e3262e]">
                      <User size={22} fill="currentColor" />
                    </div>
                    <span className="text-[#e3262e] font-extrabold text-lg uppercase">{t('common.registerFree')}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-800" />
                </button>

                <button 
                  onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                  className="flex items-center justify-between bg-white px-4 py-5 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-gray-800">
                      <LogIn size={22} />
                    </div>
                    <span className="text-gray-800 font-extrabold text-lg uppercase">{t('common.login')}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-800" />
                </button>
              </>
            )}
          </div>

          {/* Social Media Footer */}
          <div className="absolute bottom-10 left-0 right-0 px-6 text-center">
            <p className="text-gray-800 font-bold mb-6 flex items-center justify-center gap-2">
              {t('header.follow')} <span className="text-[#e3262e]">Punto</span><span className="text-gray-500 font-medium">model</span>
            </p>
            <div className="flex justify-between items-center max-w-[280px] mx-auto text-gray-800">
              <Instagram size={28} className="cursor-pointer hover:text-[#e3262e]" />
              <Facebook size={28} className="cursor-pointer hover:text-[#e3262e]" />
              <Twitter size={28} className="cursor-pointer hover:text-[#e3262e]" />
              <Music size={28} className="cursor-pointer hover:text-[#e3262e]" />
              <Send size={28} className="cursor-pointer hover:text-[#e3262e]" />
              <Play size={28} className="cursor-pointer hover:text-[#e3262e]" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
