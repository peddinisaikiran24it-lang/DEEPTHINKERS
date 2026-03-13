import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Calendar, 
  ExternalLink, 
  Trash2, 
  Loader2, 
  ChevronRight,
  Briefcase,
  UserCheck,
  Clock,
  LayoutDashboard,
  X,
  ShieldCheck,
  ShieldAlert,
  Info,
  ClipboardList,
  Bell,
  MessageCircle,
  Shield,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  TrendingUp,
  Zap,
  Sun,
  Moon,
  User as UserIcon,
  Award,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Opportunity, analyzeOpportunityImage, chatAboutOpportunities, parseChatLog, checkSafety, verifyOpportunity } from './services/gemini';
import { Dashboard } from './components/Dashboard';
import { Landing } from './components/Landing';
import { Logo } from './components/Logo';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// --- Error Boundary ---
class ErrorBoundary extends Component<any, any> {
  public state: any;
  public props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Page = 'home' | 'feed' | 'safety' | 'import' | 'profile';

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!targetDate) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (isNaN(target)) {
        setTimeLeft('Invalid Date');
        clearInterval(timer);
        return;
      }

      if (distance < 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  return (
    <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold text-xs bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg">
      <Clock size={12} />
      <span>{timeLeft}</span>
    </div>
  );
};

const VerificationBadge = ({ status }: { status?: 'unverified' | 'verified' | 'suspicious' | 'fraud' }) => {
  let color = 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700';
  let Icon = Info;
  let label = 'Unverified';

  if (status === 'verified') {
    color = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800';
    Icon = CheckCircle2;
    label = 'Verified';
  } else if (status === 'suspicious') {
    color = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800';
    Icon = AlertTriangle;
    label = 'Suspicious';
  } else if (status === 'fraud') {
    color = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800';
    Icon = ShieldAlert;
    label = 'Fraud Alert';
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${color}`}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
};

const SafetyBadge = ({ score, reasoning, showReasoning = false }: { score: number, reasoning: string, showReasoning?: boolean }) => {
  let color = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800';
  let Icon = ShieldCheck;
  let label = 'Safe';

  if (score < 40) {
    color = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800';
    Icon = ShieldAlert;
    label = 'High Risk';
  } else if (score < 75) {
    color = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800';
    Icon = Info;
    label = 'Caution';
  }

  return (
    <div className="group relative">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${color}`}>
        <Icon size={14} />
        <span>{label} ({score}%)</span>
      </div>
      {!showReasoning && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
          {reasoning || "AI analyzed legitimacy based on content and links."}
        </div>
      )}
    </div>
  );
};

function MainApp({ user }: { user: User }) {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'risk' | 'verified'>('all');
  const [syncPlatform, setSyncPlatform] = useState<'whatsapp' | 'telegram' | 'instagram'>('whatsapp');
  const [syncHistory, setSyncHistory] = useState<{ platform: string, count: number, date: number }[]>([
    { platform: 'whatsapp', count: 12, date: Date.now() - 1000 * 60 * 60 * 2 },
    { platform: 'telegram', count: 8, date: Date.now() - 1000 * 60 * 60 * 24 },
    { platform: 'instagram', count: 5, date: Date.now() - 1000 * 60 * 60 * 48 },
    { platform: 'whatsapp', count: 15, date: Date.now() - 1000 * 60 * 60 * 72 },
  ]);
  
  // Safety Scanner State
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ score: number; reasoning: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Verification State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedOppForVerification, setSelectedOppForVerification] = useState<Opportunity | null>(null);

  const [studentProfile] = useState({
    university: 'Tech Institute of Technology',
    major: 'Computer Science & Engineering',
    year: '3rd Year',
    internshipsAttended: 4,
    applicationsSent: 28,
    interviewsScheduled: 6,
    dailyTracking: [
      { day: 'Mon', tasks: 5, completed: 4 },
      { day: 'Tue', tasks: 3, completed: 3 },
      { day: 'Wed', tasks: 6, completed: 2 },
      { day: 'Thu', tasks: 4, completed: 4 },
      { day: 'Fri', tasks: 7, completed: 5 },
      { day: 'Sat', tasks: 2, completed: 1 },
      { day: 'Sun', tasks: 0, completed: 0 },
    ]
  });

  // Firestore Real-time Sync
  useEffect(() => {
    const q = query(
      collection(db, 'opportunities'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const opps: Opportunity[] = [];
      snapshot.forEach((doc) => {
        opps.push({ id: doc.id, ...doc.data() } as Opportunity);
      });
      setOpportunities(opps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'opportunities');
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleImportChat = async () => {
    if (!importText.trim()) return;
    setIsAnalyzing(true);
    
    try {
      const results = await parseChatLog(importText);
      let foundCount = 0;
      for (const res of results) {
        const newOpp = {
          uid: user.uid,
          company: res.company || 'Unknown',
          role: res.role || 'Unknown',
          eligibility: res.eligibility || 'Not specified',
          deadline: res.deadline || 'Not specified',
          deadlineDate: res.deadlineDate || '',
          link: res.link || '',
          sourceType: 'chat',
          createdAt: Date.now(),
          safetyScore: res.safetyScore || 50,
          safetyReasoning: res.safetyReasoning || '',
          verificationStatus: 'unverified'
        };
        
        try {
          await addDoc(collection(db, 'opportunities'), newOpp);
          foundCount++;
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'opportunities');
        }
      }
      
      // Update sync history
      if (foundCount > 0) {
        setSyncHistory(prev => [{
          platform: syncPlatform,
          count: foundCount,
          date: Date.now()
        }, ...prev].slice(0, 10));
      }

      setImportText('');
      setCurrentPage('feed');
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteOpp = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'opportunities', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `opportunities/${id}`);
    }
  };

  const handleSafetyScan = async () => {
    if (!scanInput.trim()) return;
    setIsScanning(true);
    try {
      const result = await checkSafety(scanInput);
      setScanResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleVerify = async (opp: Opportunity) => {
    if (!opp.id) return;
    setVerifyingId(opp.id);
    try {
      const result = await verifyOpportunity(opp);
      await updateDoc(doc(db, 'opportunities', opp.id), {
        verificationStatus: result.status,
        verificationReport: result.report,
        safetyScore: result.score,
        verifiedAt: Date.now()
      });
      // Update local state if needed, but onSnapshot handles it
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setVerifyingId(null);
    }
  };

  const seedMockData = async () => {
    setIsAnalyzing(true);
    const mockOpps = [
      {
        company: 'Google',
        role: 'STEP Internship 2026',
        eligibility: 'First and second-year undergraduate students',
        deadline: 'October 30, 2025',
        deadlineDate: '2025-10-30T23:59:59Z',
        link: 'https://buildyourfuture.withgoogle.com/programs/step',
        sourceType: 'manual',
        safetyScore: 100,
        safetyReasoning: 'Official Google Build Your Future program. Verified domain.',
        verificationStatus: 'verified'
      },
      {
        company: 'Microsoft',
        role: 'Explore Program',
        eligibility: 'Freshmen and Sophomores',
        deadline: 'Rolling Basis',
        deadlineDate: '2025-12-31T23:59:59Z',
        link: 'https://careers.microsoft.com/students/us/en/explore-program',
        sourceType: 'manual',
        safetyScore: 100,
        safetyReasoning: 'Official Microsoft Careers portal. High legitimacy.',
        verificationStatus: 'verified'
      },
      {
        company: 'Amazon',
        role: 'Software Development Engineer Internship',
        eligibility: 'Currently enrolled in a Bachelor\'s or Master\'s degree',
        deadline: 'January 15, 2026',
        deadlineDate: '2026-01-15T23:59:59Z',
        link: 'https://www.amazon.jobs/en/teams/internships-for-students',
        sourceType: 'manual',
        safetyScore: 95,
        safetyReasoning: 'Official Amazon Jobs site. Well-known global program.',
        verificationStatus: 'verified'
      },
      {
        company: 'Meta',
        role: 'Meta University (Engineering)',
        eligibility: 'Current second-year undergraduate students',
        deadline: 'September 15, 2025',
        deadlineDate: '2025-09-15T23:59:59Z',
        link: 'https://www.metacareers.com/students/',
        sourceType: 'manual',
        safetyScore: 98,
        safetyReasoning: 'Official Meta Careers student program. Verified.',
        verificationStatus: 'verified'
      }
    ];

    try {
      for (const opp of mockOpps) {
        await addDoc(collection(db, 'opportunities'), {
          ...opp,
          uid: user.uid,
          createdAt: Date.now()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'opportunities');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      const response = await chatAboutOpportunities(userMsg, opportunities);
      setChatMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "Sorry, I had trouble thinking about that." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const filteredOpps = opportunities.filter(opp => {
    const matchesSearch = opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opp.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'upcoming') {
      return matchesSearch && opp.deadlineDate && new Date(opp.deadlineDate).getTime() > Date.now();
    }
    if (activeTab === 'risk') {
      return matchesSearch && opp.safetyScore < 40;
    }
    if (activeTab === 'verified') {
      return matchesSearch && opp.verificationStatus === 'verified';
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 text-[#1A1A1A] dark:text-gray-100 font-sans selection:bg-emerald-100 flex transition-colors duration-300">
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col sticky top-0 h-screen z-40 transition-colors duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="shrink-0">
            <Logo size={40} />
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden lg:block dark:text-white">OppTracker</h1>
        </div>

        <div className="flex-1 px-4 space-y-2 py-4">
          <button 
            onClick={() => setCurrentPage('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentPage === 'home' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="hidden lg:block">Home</span>
          </button>
          <button 
            onClick={() => setCurrentPage('feed')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentPage === 'feed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Briefcase size={20} />
            <span className="hidden lg:block">Feed</span>
          </button>
          <button 
            onClick={() => setCurrentPage('safety')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentPage === 'safety' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Shield size={20} />
            <span className="hidden lg:block">Safety Center</span>
          </button>
          <button 
            onClick={() => setCurrentPage('import')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentPage === 'import' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <MessageCircle size={20} />
            <span className="hidden lg:block">WhatsApp Sync</span>
          </button>
          <button 
            onClick={() => setCurrentPage('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentPage === 'profile' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <UserIcon size={20} />
            <span className="hidden lg:block">Profile</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="hidden lg:block">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          <div className="bg-emerald-900 text-white p-4 rounded-2xl relative overflow-hidden group hidden lg:block">
            <h3 className="font-bold text-sm mb-1">AI Assistant</h3>
            <p className="text-emerald-100/80 text-[10px] mb-3">Ask about fraud checks.</p>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="w-full bg-white text-emerald-900 py-2 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-colors"
            >
              Chat Now
            </button>
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="User" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" />
            <div className="flex-1 min-w-0 hidden lg:block">
              <p className="text-xs font-bold truncate dark:text-white">{user.displayName}</p>
              <button onClick={() => signOut(auth)} className="text-[10px] text-red-500 font-bold hover:underline">Logout</button>
            </div>
            <button onClick={() => signOut(auth)} className="lg:hidden p-2 text-red-500">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
          <h2 className="text-xl font-bold capitalize dark:text-white">{currentPage === 'home' ? 'Overview' : currentPage === 'import' ? 'WhatsApp Sync' : currentPage === 'safety' ? 'Safety Center' : currentPage === 'profile' ? 'Student Profile' : 'Opportunity Feed'}</h2>
          <div className="relative max-w-md w-full mx-4 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search keywords..."
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-full text-sm transition-all w-full outline-none dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
              {opportunities.length} Tracked
            </div>
          </div>
        </header>

        <main className="p-8 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Landing onGetStarted={() => setCurrentPage('feed')} />
              </motion.div>
            )}

            {currentPage === 'feed' && (
              <motion.div 
                key="feed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight dark:text-white">Opportunity Feed</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Latest internships from your synced chats.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={seedMockData}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-2"
                    >
                      {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Add Sample Data
                    </button>
                    <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-gray-900 dark:bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'}`}>All</button>
                    <button onClick={() => setActiveTab('verified')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'verified' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'}`}>Verified</button>
                    <button onClick={() => setActiveTab('upcoming')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-orange-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'}`}>Deadlines</button>
                    <button onClick={() => setActiveTab('risk')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'risk' ? 'bg-red-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'}`}>Risks</button>
                  </div>
                </div>

                <Dashboard 
                  opportunities={opportunities} 
                  onStatClick={(type) => setActiveTab(type)}
                />

                {filteredOpps.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                      <MessageCircle size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 dark:text-white">Your feed is empty</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">Sync your WhatsApp or Telegram chats to start tracking internship opportunities automatically.</p>
                    <button 
                      onClick={() => setCurrentPage('import')}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all"
                    >
                      Sync WhatsApp Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredOpps.map((opp) => (
                      <motion.div
                        key={opp.id}
                        layout
                        className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                              <Briefcase size={24} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-base lg:text-lg leading-tight truncate text-gray-900 dark:text-white">{opp.company}</h3>
                              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs lg:text-sm truncate">{opp.role}</p>
                            </div>
                          </div>
                          <button onClick={() => deleteOpp(opp.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors p-1 shrink-0"><Trash2 size={18} /></button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <SafetyBadge score={opp.safetyScore} reasoning={opp.safetyReasoning} />
                          <VerificationBadge status={opp.verificationStatus} />
                          {opp.deadlineDate && <Countdown targetDate={opp.deadlineDate} />}
                        </div>

                        <div className="grid grid-cols-1 gap-2 mb-6 text-sm">
                          <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100/50 dark:border-gray-700/50">
                            <UserCheck size={16} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                            <span className="line-clamp-2 leading-snug">{opp.eligibility}</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100/50 dark:border-gray-700/50">
                            <Calendar size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
                            <span className="text-xs">Deadline: <span className="font-bold text-gray-900 dark:text-white">{opp.deadline}</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {opp.link ? (
                            <a 
                              href={opp.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-black dark:hover:bg-emerald-700 transition-colors"
                            >
                              Apply Now
                              <ExternalLink size={16} />
                            </a>
                          ) : (
                            <div className="flex-1 py-3 text-center text-gray-400 dark:text-gray-500 text-xs font-bold bg-gray-100 dark:bg-gray-800 rounded-2xl">No Link Provided</div>
                          )}
                          <button 
                            onClick={() => {
                              if (opp.verificationReport) {
                                setSelectedOppForVerification(opp);
                              } else {
                                handleVerify(opp);
                              }
                            }}
                            disabled={verifyingId === opp.id}
                            className={`p-3 rounded-2xl transition-all flex items-center justify-center ${
                              verifyingId === opp.id 
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600' 
                                : opp.verificationReport 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50' 
                                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            }`}
                            title={opp.verificationReport ? "View Verification Report" : "Verify Opportunity"}
                          >
                            {verifyingId === opp.id ? (
                              <Loader2 className="animate-spin" size={20} />
                            ) : opp.verificationReport ? (
                              <ShieldCheck size={20} />
                            ) : (
                              <UserCheck size={20} />
                            )}
                          </button>
                          <button 
                            onClick={() => {
                              setCurrentPage('safety');
                              setScanInput(opp.company + " " + opp.role + " " + opp.eligibility);
                            }}
                            className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                            title="Check Safety Details"
                          >
                            <Shield size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {currentPage === 'safety' && (
              <motion.div 
                key="safety"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold dark:text-white">Safety Scanner</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Paste any job description or link to check for fraud.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <textarea 
                        className="w-full h-48 p-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none text-sm resize-none dark:text-white"
                        placeholder="Paste job details or suspicious links here..."
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                      />
                      {scanInput && (
                        <button 
                          onClick={() => setScanInput('')}
                          className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleSafetyScan}
                      disabled={!scanInput.trim() || isScanning}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none active:scale-[0.98]"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span>Analyzing Security Patterns...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={20} />
                          <span>Run Deep Safety Analysis</span>
                        </>
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {scanResult && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-8 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-lg dark:text-white">Analysis Result</h4>
                          <SafetyBadge score={scanResult.score} reasoning={scanResult.reasoning} showReasoning />
                        </div>
                        <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                          {scanResult.score >= 75 ? (
                            <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                          ) : scanResult.score >= 40 ? (
                            <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                          ) : (
                            <ShieldAlert className="text-red-500 shrink-0" size={24} />
                          )}
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{scanResult.reasoning}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold px-2 dark:text-white">Safety Scoreboard</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {opportunities.map(opp => (
                      <div key={opp.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${opp.safetyScore >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : opp.safetyScore >= 40 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                            {opp.safetyScore >= 75 ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm dark:text-white">{opp.company}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{opp.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Score</div>
                            <div className={`text-lg font-black ${opp.safetyScore >= 75 ? 'text-emerald-600 dark:text-emerald-400' : opp.safetyScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{opp.safetyScore}%</div>
                          </div>
                          <button 
                            onClick={() => {
                              setScanResult({ score: opp.safetyScore, reasoning: opp.safetyReasoning });
                              setScanInput(opp.company + " " + opp.role);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            <Info size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentPage === 'import' && (
              <motion.div 
                key="import"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Sync Controls */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                            <MessageCircle size={24} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold dark:text-white">Real-time Sync</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Paste chat logs to extract internships.</p>
                          </div>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                          {(['whatsapp', 'telegram', 'instagram'] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setSyncPlatform(p)}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${syncPlatform === p ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <textarea 
                          className="w-full h-64 p-6 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none text-sm font-mono resize-none dark:text-white"
                          placeholder={`Paste your ${syncPlatform} chat messages here...`}
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800">
                          {importText.length} characters
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setImportText('')}
                          className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                          Clear
                        </button>
                        <button 
                          onClick={handleImportChat}
                          disabled={!importText.trim() || isAnalyzing}
                          className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 dark:shadow-none active:scale-[0.98]"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="animate-spin" size={24} />
                              <span>AI Processing...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={24} />
                              <span>Sync Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sync History List */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                      <h4 className="font-bold mb-4 flex items-center gap-2 dark:text-white">
                        <Clock size={18} className="text-gray-400 dark:text-gray-500" />
                        Recent Sync Activity
                      </h4>
                      <div className="space-y-3">
                        {syncHistory.length === 0 ? (
                          <p className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm italic">No recent sync activity.</p>
                        ) : (
                          syncHistory.map((sync, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${sync.platform === 'whatsapp' ? 'bg-emerald-500' : sync.platform === 'telegram' ? 'bg-sky-500' : 'bg-pink-500'}`}>
                                  <MessageCircle size={16} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold capitalize dark:text-white">{sync.platform} Sync</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(sync.date).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{sync.count}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Opps Found</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Analytics Sidebar */}
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                      <h4 className="font-bold mb-6 flex items-center gap-2 dark:text-white">
                        <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                        Platform Distribution
                      </h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'WhatsApp', value: syncHistory.filter(s => s.platform === 'whatsapp').reduce((acc, s) => acc + s.count, 0) || 1 },
                                { name: 'Telegram', value: syncHistory.filter(s => s.platform === 'telegram').reduce((acc, s) => acc + s.count, 0) || 0 },
                                { name: 'Instagram', value: syncHistory.filter(s => s.platform === 'instagram').reduce((acc, s) => acc + s.count, 0) || 0 },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#0ea5e9" />
                              <Cell fill="#ec4899" />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#111827'
                              }}
                              itemStyle={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                        <div className="flex justify-center gap-4 mt-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> WA
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-sky-500" /> TG
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-pink-500" /> IG
                          </div>
                        </div>
                    </div>

                    <div className="bg-emerald-900 dark:bg-emerald-950 text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                      <div className="relative z-10">
                        <Zap className="text-emerald-400 mb-4" size={32} />
                        <h4 className="text-xl font-bold mb-2">AI Extraction</h4>
                        <p className="text-emerald-100/70 dark:text-emerald-200/60 text-sm leading-relaxed mb-6">
                          Our neural engine identifies company names, roles, and deadlines from messy chat logs with 98% accuracy.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-xs font-bold">
                            <div className="w-5 h-5 bg-emerald-800 dark:bg-emerald-900 rounded-full flex items-center justify-center text-[10px]">1</div>
                            <span>Auto-detection of links</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold">
                            <div className="w-5 h-5 bg-emerald-800 dark:bg-emerald-900 rounded-full flex items-center justify-center text-[10px]">2</div>
                            <span>Fraud pattern matching</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-800/30 dark:bg-emerald-900/30 rounded-full blur-3xl" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentPage === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                {/* Profile Header */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=10b981&color=fff`} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-emerald-50 dark:border-emerald-900/30"
                    />
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                      <Award size={20} />
                    </div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h3 className="text-3xl font-black mb-2 dark:text-white">{user.displayName}</h3>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold mb-4 flex items-center justify-center md:justify-start gap-2">
                      <Briefcase size={16} />
                      {studentProfile.major}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400">
                        {studentProfile.university}
                      </div>
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400">
                        {studentProfile.year}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-3xl text-center">
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{studentProfile.internshipsAttended}</div>
                      <div className="text-[10px] uppercase font-bold text-emerald-800/60 dark:text-emerald-400/60">Internships</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-3xl text-center">
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{studentProfile.applicationsSent}</div>
                      <div className="text-[10px] uppercase font-bold text-blue-800/60 dark:text-blue-400/60">Applied</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Daily Tracking Chart */}
                  <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                        <Activity size={20} className="text-emerald-600" />
                        Daily Activity Tracking
                      </h4>
                      <div className="text-xs font-bold text-gray-400">This Week</div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={studentProfile.dailyTracking}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#f3f4f6'} />
                          <XAxis 
                            dataKey="day" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fontWeight: 600, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} 
                          />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ fill: theme === 'dark' ? '#1f2937' : '#f9fafb' }}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                              color: theme === 'dark' ? '#ffffff' : '#111827'
                            }}
                          />
                          <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
                          <Bar dataKey="tasks" fill={theme === 'dark' ? '#374151' : '#e5e7eb'} radius={[6, 6, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" /> Completed
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm" /> Total Tasks
                      </div>
                    </div>
                  </div>

                  {/* Skills & Achievements */}
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                      <h4 className="font-bold mb-6 dark:text-white">Quick Stats</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center">
                              <UserCheck size={16} />
                            </div>
                            <span className="text-xs font-bold dark:text-gray-300">Interviews</span>
                          </div>
                          <span className="font-black dark:text-white">{studentProfile.interviewsScheduled}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
                              <Calendar size={16} />
                            </div>
                            <span className="text-xs font-bold dark:text-gray-300">Days Active</span>
                          </div>
                          <span className="font-black dark:text-white">142</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                      <h4 className="font-bold mb-2">Next Milestone</h4>
                      <p className="text-emerald-100 text-xs mb-6">Complete 5 more applications to reach "Pro Hunter" status.</p>
                      <div className="w-full bg-emerald-700/50 h-2 rounded-full mb-2">
                        <div className="bg-white h-full rounded-full" style={{ width: '70%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>70% Complete</span>
                        <span>30/40 Apps</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Verification Report Modal */}
      <AnimatePresence>
        {selectedOppForVerification && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOppForVerification(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl z-[90] overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-blue-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Verification Report</h3>
                    <p className="text-blue-100 text-sm">{selectedOppForVerification.company} • {selectedOppForVerification.role}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOppForVerification(null)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <VerificationBadge status={selectedOppForVerification.verificationStatus} />
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Status</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Safety Score</div>
                    <div className={`text-xl font-black ${selectedOppForVerification.safetyScore >= 75 ? 'text-emerald-600 dark:text-emerald-400' : selectedOppForVerification.safetyScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{selectedOppForVerification.safetyScore}%</div>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                  <h4 className="text-gray-900 dark:text-white font-bold mb-2">Findings:</h4>
                  <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 font-medium italic">
                    {selectedOppForVerification.verificationReport}
                  </div>
                </div>

                {selectedOppForVerification.verifiedAt && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase text-center">
                    Verified on {new Date(selectedOppForVerification.verifiedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex gap-4">
                <button 
                  onClick={() => setSelectedOppForVerification(null)}
                  className="flex-1 py-4 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleVerify(selectedOppForVerification);
                    setSelectedOppForVerification(null);
                  }}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                  <Loader2 className={verifyingId === selectedOppForVerification.id ? "animate-spin" : "hidden"} size={18} />
                  Re-Verify
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col border-l border-gray-100 dark:border-gray-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-emerald-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">OppTracker AI</h3>
                    <p className="text-xs text-emerald-100">Fraud & Deadline Expert</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                      <ShieldCheck size={32} />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Safety First</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ask about any opportunity's safety score or upcoming deadlines.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChat} className="p-6 border-t border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask about safety or deadlines..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm transition-all outline-none dark:text-white"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-100 dark:shadow-none max-w-md w-full text-center border border-gray-100 dark:border-gray-800"
      >
        <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-emerald-200 dark:shadow-none">
          <LayoutDashboard size={40} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">OppTracker</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">Securely track internships, verify legitimacy, and never miss a deadline.</p>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-4 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-emerald-200 dark:hover:border-emerald-500 transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Sign in with Google
            </>
          )}
        </button>
        
        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">100%</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Secure</div>
          </div>
          <div className="text-center">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">AI</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Verified</div>
          </div>
          <div className="text-center">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">Real</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Time</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={40} />
          <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse">Initializing OppTracker...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {user ? <MainApp user={user} /> : <Login />}
    </ErrorBoundary>
  );
}
