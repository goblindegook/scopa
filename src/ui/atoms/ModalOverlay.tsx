import styled from '@emotion/styled'

export const ModalOverlay = styled('main')<{ $absolute?: boolean; $zIndex?: number; $padded?: boolean }>`
  position: ${({ $absolute }) => ($absolute ? 'absolute' : 'fixed')};
  inset: 0;
  z-index: ${({ $zIndex = 10001 }) => $zIndex};
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

  ${({ $padded }) =>
    $padded &&
    `
    padding: var(--space-4);
    box-sizing: border-box;
    `}
`

export const ModalPanel = styled('div')<{
  $maxWidth?: string
}>`
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
  max-width: ${({ $maxWidth = '540px' }) => $maxWidth};
  width: 100%;

  @media (max-height: 600px) {
    gap: var(--space-4);
    padding: var(--space-8);
  }
`
