import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Menu, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Playbook', href: '#features' },
    { name: 'Security', href: '#safety' },
    { name: 'Pricing', href: '#pricing' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6 pointer-events-none">
      <nav 
        className={`w-full max-w-6xl pointer-events-auto transition-all duration-500 rounded-[24px] border ${
          isScrolled 
          ? 'bg-white/80 backdrop-blur-2xl border-slate-200/60 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.05)] py-3 px-6' 
          : 'bg-transparent border-transparent py-5 px-6'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">PipelineX</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            <div className="flex items-center gap-8">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-slate-500 hover:text-indigo-600 transition-colors font-bold text-[13px] tracking-tight"
                >
                  {link.name}
                </a>
              ))}
            </div>
            
            <div className="h-4 w-px bg-slate-200 mx-2" />
            
            <div className="flex items-center gap-3">
              <Link 
                to="/dashboard" 
                className="text-slate-900 font-bold text-[13px] hover:text-indigo-600 transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link 
                to="/dashboard" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-[13px] font-black tracking-tight transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden text-slate-900 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="md:hidden bg-white border border-slate-100 rounded-3xl mt-4 p-8 flex flex-col gap-6 shadow-2xl"
            >
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  className="text-slate-900 font-black text-lg tracking-tight"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px bg-slate-100 w-full" />
              <Link 
                to="/dashboard" 
                className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-center font-black tracking-tight shadow-xl shadow-indigo-500/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start Free Trial
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}
