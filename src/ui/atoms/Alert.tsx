import styled from '@emotion/styled'

export const Alert = styled('aside')`
  position: absolute;
  top: 66%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  padding: var(--space-8);
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  background-color: var(--overlay-black-60);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--space-4);
  box-shadow: 0 4px 12px var(--overlay-black-40);
  z-index: 9999;
  white-space: nowrap;
  pointer-events: none;
`
