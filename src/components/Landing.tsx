import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  ArrowRight,
  Globe,
  Lock,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

interface LandingProps {
  onGetStarted: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <Logo size={48} />
              <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                AI-Powered Internship Tracker
              </span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.9] mb-8 text-gray-900 dark:text-white">
              Your Career <br />
              <span className="text-emerald-600 dark:text-emerald-500">Shield & Compass.</span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
              OppTracker uses advanced AI to sync your chat logs, verify company legitimacy, and protect you from internship fraud. All in one real-time dashboard.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={onGetStarted}
                className="px-8 py-4 bg-gray-900 dark:bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-black dark:hover:bg-emerald-700 transition-all shadow-xl shadow-gray-200 dark:shadow-none active:scale-95"
              >
                Get Started Now
                <ArrowRight size={20} />
              </button>
              <button className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95">
                View Demo
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Elements Decor */}
        <div className="absolute top-0 right-0 -z-10 opacity-10 blur-3xl pointer-events-none">
          <div className="w-[500px] h-[500px] bg-emerald-400 rounded-full" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
            <MessageSquare size={28} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">WhatsApp Sync</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Paste your chat logs and let our AI extract roles, companies, and deadlines automatically. No more manual entry.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Deep Verification</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            We use Google Search grounding to verify if the company is real and if the role is officially listed. Stay safe from scams.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mb-6">
            <Zap size={28} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Real-time Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Track your application status, deadlines, and safety scores in a beautiful, unified interface designed for students.
          </p>
        </motion.div>
      </section>

      {/* Trust Section */}
      <section className="bg-gray-900 dark:bg-emerald-950 rounded-[3rem] p-12 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-bold mb-6">Built for the Modern Student.</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-lg"><Globe size={20} /></div>
              <div>
                <h4 className="font-bold mb-1">Global Reach</h4>
                <p className="text-gray-400 dark:text-emerald-200/60 text-xs">Supports internships from any country or platform.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-lg"><Lock size={20} /></div>
              <div>
                <h4 className="font-bold mb-1">Privacy First</h4>
                <p className="text-gray-400 dark:text-emerald-200/60 text-xs">Your chat logs are processed securely and never shared.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-lg"><Search size={20} /></div>
              <div>
                <h4 className="font-bold mb-1">Search Grounded</h4>
                <p className="text-gray-400 dark:text-emerald-200/60 text-xs">Verification backed by real-time Google Search data.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-lg"><ShieldCheck size={20} /></div>
              <div>
                <h4 className="font-bold mb-1">Fraud Detection</h4>
                <p className="text-gray-400 dark:text-emerald-200/60 text-xs">Advanced AI patterns to spot suspicious postings.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-600/20 translate-x-1/2 skew-x-12" />
      </section>
    </div>
  );
};
