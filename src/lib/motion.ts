import { Variants, Transition, MotionProps } from "framer-motion";

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
};

export const viewportOnce: MotionProps["viewport"] = { once: true, amount: 0.2 };

export const transition: Transition = {
    duration: 0.7, // 0.6–0.8s locked
    ease: [0.16, 1, 0.3, 1], // easeOut feel
};
