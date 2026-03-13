import React from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Opportunity } from '../services/gemini';

interface DashboardProps {
  opportunities: Opportunity[];
  onStatClick?: (type: 'all' | 'verified' | 'upcoming' | 'risk') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ opportunities, onStatClick }) => {
  const totalOpps = opportunities.length;
  const verifiedOpps = opportunities.filter(o => o.verificationStatus === 'verified').length;
  const upcomingDeadlines = opportunities.filter(o => {
    if (!o.deadlineDate) return false;
    const deadline = new Date(o.deadlineDate).getTime();
    const now = Date.now();
    return deadline > now && (deadline - now) < (7 * 24 * 60 * 60 * 1000); // within 7 days
  }).length;
  const highRisk = opportunities.filter(o => o.safetyScore < 40).length;

  const stats = [
    {
      id: 'all' as const,
      label: 'Total Tracked',
      value: totalOpps,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50',
      trend: '+12%',
      trendUp: true
    },
    {
      id: 'verified' as const,
      label: 'Verified Safe',
      value: verifiedOpps,
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50',
      trend: '85%',
      trendUp: true
    },
    {
      id: 'upcoming' as const,
      label: 'Urgent Deadlines',
      value: upcomingDeadlines,
      icon: Clock,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50',
      trend: 'Next 7d',
      trendUp: false
    },
    {
      id: 'risk' as const,
      label: 'Risk Alerts',
      value: highRisk,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50',
      trend: 'Low',
      trendUp: false
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onStatClick?.(stat.id)}
          className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group cursor-pointer active:scale-95"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 ${stat.bg} dark:bg-gray-800 ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
              <stat.icon size={24} />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${stat.trendUp ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
              {stat.trendUp ? <ArrowUpRight size={10} /> : null}
              {stat.trend}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <h4 className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</h4>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
