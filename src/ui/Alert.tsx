import styled from '@emotion/styled'

export const Alert = styled('aside')`
  position: absolute;
  top: 66%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  padding: 1.5rem 2.5rem;
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  white-space: nowrap;
  pointer-events: none;
`
