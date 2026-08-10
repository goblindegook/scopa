import styled from '@emotion/styled'

export const ModalOverlay = styled('main')<{ $absolute?: boolean; $zIndex?: number }>`
  position: ${({ $absolute }) => ($absolute ? 'absolute' : 'fixed')};
  inset: 0;
  z-index: 10002;
  display: flex;
  justify-content: safe center;
  align-items: safe center;
  overflow-y: auto;
  background-color: var(--overlay-black-60);

  ${({ $absolute }) =>
    !$absolute &&
    `
    min-height: 100vh;
    min-height: 100dvh;
    `}
`

export const ModalPanel = styled('div')`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  gap: var(--space-8);
  background-color: var(--overlay-black-60);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--space-4);
  box-shadow: 0 8px 24px var(--overlay-black-40);
  padding: var(--space-8);
  max-width: 540px;
  width: 100%;

  @media (max-height: 600px) {
    gap: var(--space-4);
    padding: var(--space-8);
  }
`
