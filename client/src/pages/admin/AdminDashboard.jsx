import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users, Wallet, Activity } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const socket = useSocket();

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/analytics`);
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    if (socket) {
      socket.on('order:new', fetchAnalytics);
      socket.on('order:update', fetchAnalytics);
    }

    return () => {
      if (socket) {
        socket.off('order:new');
        socket.off('order:update');
      }
    };
  }, [socket]);

  return (
    <div>
      <header className="mb-12 border-b border-white/10 pb-6">
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Dashboard Overview</h2>
        <p className="text-primary text-sm uppercase tracking-widest font-bold">Today's Performance</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Orders', value: stats?.totalOrdersToday || 0, icon: Activity, color: 'text-primary' },
          { label: 'Revenue', value: '₹' + (stats?.revenue || '0.00'), icon: Wallet, color: 'text-emerald-400' },
          { label: 'Active Tables', value: stats?.activeTables || 0, icon: Users, color: 'text-blue-400' },
          { label: 'Growth', value: stats?.growth || '0.0%', icon: TrendingUp, color: 'text-purple-400' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-panel p-8 flex flex-col justify-between h-48 hover:-translate-y-1 transition-transform">
              <div className="flex justify-between items-start">
                <span className="text-text-muted text-xs uppercase tracking-widest font-bold">{stat.label}</span>
                <div className={`p-3 bg-surface rounded-xl border border-white/5 shadow-inner ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <span className="text-4xl font-serif font-bold text-white mt-auto">{stat.value}</span>
            </div>
          )
        })}
      </div>

      <div className="glass-panel p-8 border-t-4 border-t-primary">
        <h3 className="font-serif font-bold text-2xl text-white mb-6">Trending Items</h3>
        {stats?.popularItems?.length > 0 ? (
          <div className="space-y-2">
            {stats.popularItems.map((item, i) => (
              <div key={item._id} className="flex justify-between items-center bg-surface-light/30 p-4 rounded-xl border border-white/5 hover:bg-surface/50 transition-colors">
                <div className="flex items-center gap-6">
                  <span className="text-primary font-serif font-bold text-xl italic">{i + 1}.</span>
                  <span className="font-bold text-lg text-white">{item._id}</span>
                </div>
                <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
                  {item.count} Ordered
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-surface/30 rounded-2xl border border-white/5">
            <p className="text-text-muted text-sm font-medium">No sales data recorded yet for today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
