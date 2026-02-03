"use client";

import { motion } from "framer-motion";
import { fadeUp, transition, viewportOnce } from "@/lib/motion";

export default function Section({
    id,
    className = "",
    children,
}: {
    id?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className={`w-full ${className}`}>
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={fadeUp}
                transition={transition}
                className="mx-auto max-w-6xl px-6"
            >
                {children}
            </motion.div>
        </section>
    );
}
