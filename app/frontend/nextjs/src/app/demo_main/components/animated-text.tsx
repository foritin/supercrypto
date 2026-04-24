"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  once?: boolean;
}

export function AnimatedText({
  text,
  className = "",
  delay = 0,
  staggerDelay = 0.03,
  once = true,
}: AnimatedTextProps) {
  const prefersReduced = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.3 }}
      aria-label={text}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-flex mr-[0.25em]">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once }}
              transition={{
                delay: delay + (wordIndex * word.length + charIndex) * staggerDelay,
                type: "spring",
                damping: 18,
                stiffness: 120,
              }}
              className="inline-block"
              style={{ willChange: "transform, opacity" }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.span>
  );
}

interface AnimatedHeadingProps {
  line1: string;
  line2?: string;
  line1ClassName?: string;
  line2ClassName?: string;
  delay?: number;
}

export function AnimatedHeading({
  line1,
  line2,
  line1ClassName = "",
  line2ClassName = "",
  delay = 0,
}: AnimatedHeadingProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <h1 className="text-center">
        <span className={`block ${line1ClassName}`}>{line1}</span>
        {line2 && <span className={`block ${line2ClassName}`}>{line2}</span>}
      </h1>
    );
  }

  return (
    <h1 className="text-center">
      <motion.span
        className={`block ${line1ClassName}`}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay,
          duration: 0.8,
          ease: "easeOut",
        }}
      >
        {line1}
      </motion.span>
      {line2 && (
        <motion.span
          className={`block ${line2ClassName}`}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + 0.15,
            duration: 0.8,
            ease: "easeOut",
          }}
        >
          {line2}
        </motion.span>
      )}
    </h1>
  );
}
