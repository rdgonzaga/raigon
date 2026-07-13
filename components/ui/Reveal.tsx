"use client";

import { motion } from "framer-motion";
import { useRevealVariants } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
};

export function Reveal({ children, className = "" }: RevealProps) {
  const { container, item, reveal } = useRevealVariants();

  return (
    <motion.div variants={container} {...reveal} className={className}>
      <motion.div variants={item}>{children}</motion.div>
    </motion.div>
  );
}
