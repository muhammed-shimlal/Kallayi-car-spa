import React from 'react';
import { Calendar, CheckCircle, Car, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

interface HistoryTabProps {
    history: any[];
}

export function HistoryTab({ history }: HistoryTabProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex justify-between items-end mb-10">
                <div>
                    <span className="text-[#E52323] text-[10px] font-bold tracking-[0.3em] uppercase">Service Logs</span>
                    <h1 className="text-4xl font-bold tracking-tighter mt-2 text-white">Operation History</h1>
                </div>
            </div>

            {(!history || history.length === 0) ? (
                <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner">
                    <Car className="w-12 h-12 text-white/10 mb-4" />
                    <h3 className="text-xl font-bold text-gray-500">No Past Operations</h3>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2 font-bold">Your fleet service history will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {(history || []).map((record, index) => (
                        <div key={record.id || index} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/20 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#E52323]/20 p-3 rounded-xl border border-[#E52323]/30">
                                    <CheckCircle className="w-6 h-6 text-[#E52323]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {record.service_package?.name || 'Service Wash'}
                                        {record.vehicle ? ` - ${record.vehicle.make} ${record.vehicle.model}` : ''}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest flex items-center gap-2 font-bold">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(record.created_at || record.end_time || Date.now()).toLocaleDateString()} 
                                        {record.vehicle?.plate_number ? ` • ${record.vehicle.plate_number}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right mt-4 md:mt-0 flex flex-col items-end">
                                <p className="text-xl font-black text-white">₹{record.total_price || record.service_package?.price || '0'}</p>
                                <p className="text-[10px] text-[#E52323] uppercase tracking-widest font-bold mt-1 mb-3">Completed</p>
                                
                                {(record.total_price || record.service_package?.price) ? (
                                    <button 
                                        onClick={() => window.open(`${API_BASE}/finance/invoice/${record.id}/pdf/`, '_blank')}
                                        className="flex items-center gap-2 bg-white/5 hover:bg-[#01FFFF]/20 text-[#01FFFF] text-[10px] uppercase font-bold tracking-widest px-4 py-2 rounded-lg border border-white/10 transition-all"
                                    >
                                        <Download className="w-3 h-3" /> View Invoice
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
