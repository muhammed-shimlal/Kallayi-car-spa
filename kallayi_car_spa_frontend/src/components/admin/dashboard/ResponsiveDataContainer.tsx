'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessor: (item: T) => React.ReactNode;
    mobilePrimary?: boolean; // Primary title/heading on mobile card
    mobileSecondary?: boolean; // Subtitle on mobile card
    mobileBadge?: boolean; // Status badge on mobile card header
    hideOnMobile?: boolean; // Hide this column on mobile view
}

interface ResponsiveDataContainerProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T, index: number) => string | number;
    title?: string;
    subtitle?: string;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    actionButtons?: (item: T) => React.ReactNode;
}

function ResponsiveDataContainerComponent<T>({
    data,
    columns,
    keyExtractor,
    title,
    subtitle,
    emptyMessage = 'No records found.',
    onRowClick,
    actionButtons,
}: ResponsiveDataContainerProps<T>) {
    const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});

    const toggleExpand = (key: string | number) => {
        setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (!data || data.length === 0) {
        return (
            <div className="bg-[#0a0a0d] rounded-2xl p-8 text-center border border-white/5 shadow-[4px_4px_10px_#020203,-4px_-4px_10px_#14151a]">
                <p className="text-sm font-mono text-neutral-500 uppercase tracking-widest">{emptyMessage}</p>
            </div>
        );
    }

    const primaryCol = columns.find((c) => c.mobilePrimary) || columns[0];
    const secondaryCol = columns.find((c) => c.mobileSecondary) || columns[1];
    const badgeCol = columns.find((c) => c.mobileBadge);
    const detailCols = columns.filter((c) => !c.mobilePrimary && !c.mobileSecondary && !c.mobileBadge && !c.hideOnMobile);

    return (
        <div className="w-full space-y-4">
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h3 className="text-lg font-bold text-white font-syncopate uppercase tracking-wide">{title}</h3>}
                    {subtitle && <p className="text-xs text-neutral-400 font-mono tracking-wider">{subtitle}</p>}
                </div>
            )}

            {/* --- MOBILE VIEW: Touch-Optimized Neumorphic Cards (< md) --- */}
            <div className="md:hidden space-y-3.5">
                {data.map((item, idx) => {
                    const key = keyExtractor(item, idx);
                    const isExpanded = !!expandedCards[key];

                    return (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                            className="bg-[#0a0a0d] rounded-2xl p-4 border border-white/10 shadow-[4px_4px_12px_#020203,-4px_-4px_12px_#14151a] transition-all"
                        >
                            {/* Card Main Row / Header */}
                            <div className="flex items-center justify-between gap-3">
                                <div
                                    className="flex-1 min-w-0 cursor-pointer py-1"
                                    onClick={() => onRowClick ? onRowClick(item) : toggleExpand(key)}
                                >
                                    <div className="font-bold text-sm text-white truncate flex items-center gap-2">
                                        {primaryCol.accessor(item)}
                                    </div>
                                    {secondaryCol && (
                                        <div className="text-xs text-neutral-400 font-mono truncate mt-0.5">
                                            {secondaryCol.accessor(item)}
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Badge & Expand Button */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {badgeCol && <div>{badgeCol.accessor(item)}</div>}

                                    <button
                                        onClick={() => toggleExpand(key)}
                                        className="w-12 h-12 rounded-xl bg-[#0e0e12] shadow-[inset_2px_2px_4px_#020203,inset_-2px_-2px_4px_#14151a] flex items-center justify-center text-neutral-400 hover:text-white transition-colors active:scale-95 touch-manipulation"
                                        aria-label="Toggle details"
                                    >
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-[#01FFFF]" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Details Body */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden pt-3.5 mt-3 border-t border-white/5 space-y-2.5"
                                    >
                                        {detailCols.map((col, cIdx) => (
                                            <div key={cIdx} className="flex justify-between items-center text-xs py-1">
                                                <span className="text-neutral-500 font-mono uppercase tracking-wider">{col.header}:</span>
                                                <span className="font-medium text-white text-right ml-4">{col.accessor(item)}</span>
                                            </div>
                                        ))}

                                        {actionButtons && (
                                            <div className="pt-3 mt-2 border-t border-white/5 flex items-center justify-end gap-2">
                                                {actionButtons(item)}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* --- DESKTOP VIEW: Clean Table with Horizontal Scroll (>= md) --- */}
            <div className="hidden md:block bg-[#0a0a0d] rounded-2xl border border-white/10 shadow-[8px_8px_20px_#020203,-8px_-8px_20px_#14151a] overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-[#070709] text-xs font-mono text-neutral-400 uppercase tracking-widest">
                                {columns.map((col, idx) => (
                                    <th key={idx} className="py-4 px-5 font-semibold">
                                        {col.header}
                                    </th>
                                ))}
                                {actionButtons && <th className="py-4 px-5 text-right font-semibold">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-neutral-300">
                            {data.map((item, idx) => {
                                const key = keyExtractor(item, idx);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={`hover:bg-white/[0.03] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                    >
                                        {columns.map((col, cIdx) => (
                                            <td key={cIdx} className="py-4 px-5 align-middle">
                                                {col.accessor(item)}
                                            </td>
                                        ))}
                                        {actionButtons && (
                                            <td className="py-4 px-5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    {actionButtons(item)}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const ResponsiveDataContainer = React.memo(ResponsiveDataContainerComponent) as typeof ResponsiveDataContainerComponent;
