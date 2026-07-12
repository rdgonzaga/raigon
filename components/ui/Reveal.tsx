"use client";

import { motion } from "framer-motion";
import { useRevealVariants } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
};

export function Reveal({ children, className = "" }: RevealProps) {
  const { container, item } = useRevealVariants();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "-80px" }}
      className={className}
    >
      <motion.div variants={item}>{children}</motion.div>
    </motion.div>
  );
}
