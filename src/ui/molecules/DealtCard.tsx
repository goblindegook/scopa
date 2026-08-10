import { motion } from 'framer-motion'
import type React from 'react'
import { Duration } from '../atoms/Card'

export type ScaleInCardProps = React.PropsWithChildren<{
  isNew: boolean
  index: number
}>

export const DealtCard: React.FC<ScaleInCardProps> = ({ isNew, index, children }) => {
  return (
    <motion.div
      style={{ display: 'inline-block' }}
      initial={isNew ? { scale: 0.5 } : false}
      animate={isNew ? { scale: [0.5, 1.2, 1] } : { scale: 1 }}
      transition={
        isNew
          ? {
              delay: index * Duration.DEAL,
              type: 'spring',
              stiffness: 300,
              damping: 20,
              opacity: {
                delay: index * Duration.DEAL,
                duration: Duration.DEAL,
                ease: 'easeOut',
              },
              scale: {
                delay: index * Duration.DEAL,
                duration: 2 * Duration.DEAL,
                times: [0, 0.6, 1],
                ease: [0.34, 1.56, 0.64, 1],
              },
            }
          : { duration: 0 }
      }
    >
      {children}
    </motion.div>
  )
}
