import styled from '@emotion/styled'
import { motion } from 'framer-motion'

export const Table = styled(motion.section)`
  align-content: center;
  display: flex;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-height: 0;
  justify-content: center;
  position: relative;
  gap: var(--space-4);
  padding: 0 var(--space-2);

  @media (max-height: 600px) {
    gap: var(--space-2);
  }
`
