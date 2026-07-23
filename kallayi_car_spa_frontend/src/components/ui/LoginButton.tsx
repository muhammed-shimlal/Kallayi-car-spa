'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoginButtonProps {
    onClick?: () => void;
    className?: string;
}

export default function LoginButton({ onClick, className = '' }: LoginButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`
                relative inline-flex items-center justify-center px-6 py-2.5 
                rounded-full bg-transparent border border-white/25 
                text-white text-xs font-semibold uppercase tracking-[0.25em]
                transition-all duration-300 ease-out
                hover:bg-white hover:text-black hover:border-white
                hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]
                active:shadow-none focus:outline-none cursor-pointer
                ${className}
            `}
        >
            <span>LOGIN</span>
        </motion.button>
    );
}
