import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Star, MessageSquareQuote, Search, Calendar, User, Filter, AlertCircle } from 'lucide-react';

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState('all');

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/reviews`, { withCredentials: true });
                setReviews(res.data);
            } catch (error) {
                console.error("Failed to fetch reviews", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    // Derived stats
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
        : 0;
    
    // Filtered reviews
    const filteredReviews = reviews.filter(review => {
        const matchesSearch = review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              review.comment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRating = filterRating === 'all' || review.rating.toString() === filterRating;
        return matchesSearch && matchesRating;
    });

    const renderStars = (rating) => {
        return Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'fill-primary text-primary' : 'text-white/20'}`}
            />
        ));
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <h1 className="text-3xl font-serif font-black text-white flex items-center gap-3">
                        <MessageSquareQuote className="w-8 h-8 text-primary" />
                        Customer Reviews
                    </h1>
                    <p className="text-text-muted mt-2 text-sm">Monitor and analyze customer feedback to improve cafe experience.</p>
                </div>
                
                {/* Stats Card */}
                <div className="bg-surface-light border border-white/10 rounded-3xl p-6 flex items-center justify-between shadow-xl">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">Average Rating</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-serif font-black text-primary">{averageRating}</h2>
                            <span className="text-sm text-text-muted">/ 5.0</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-1">Total</p>
                        <h2 className="text-3xl font-black text-white">{totalReviews}</h2>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface-light border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Search by customer name or comment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary outline-none transition-colors placeholder:text-text-muted/50"
                    />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Filter className="w-4 h-4 text-text-muted" />
                    <select 
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none appearance-none min-w-[150px] cursor-pointer"
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
            </div>

            {/* Reviews Grid */}
            {filteredReviews.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Reviews Found</h3>
                    <p className="text-text-muted text-sm max-w-md">Try adjusting your filters or wait for more customers to leave feedback.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredReviews.map((review, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={review._id}
                            className="bg-surface-light border border-white/10 rounded-3xl p-6 hover:border-primary/30 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{review.customerName}</h3>
                                        <div className="flex items-center gap-1 mt-1">
                                            {renderStars(review.rating)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-background/50 rounded-2xl p-4 border border-white/5">
                                <p className="text-sm text-white/80 leading-relaxed italic">
                                    "{review.comment}"
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
