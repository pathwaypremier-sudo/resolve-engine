"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface RevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export default function Reveal({ children, className = "", delay = 0 }: RevealProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: "easeOut", delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
