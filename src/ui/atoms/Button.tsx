import styled from '@emotion/styled'

export const Button = styled('button')`
  position: relative;
  border-radius: var(--space-2);
  padding: var(--space-2) var(--space-4);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  background: var(--color-primary);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px var(--color-primary-shadow-40);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover {
    background: var(--color-primary-hover);
    box-shadow: 0 6px 20px var(--color-primary-shadow-60);
  }

  &:active {
    transform: translateY(0);
    background: var(--color-primary-active);
    box-shadow: 0 2px 10px var(--color-primary-shadow-40);
  }

  &:focus {
    outline: 2px solid var(--overlay-white-50);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: 0 2px 8px var(--color-primary-shadow-20);

    &:hover {
      background: var(--color-primary);
      box-shadow: 0 2px 8px var(--color-primary-shadow-20);
    }
  }

  @media (max-height: 600px) {
    padding: var(--space-1) var(--space-2);
    font-size: 0.875rem;
  }
`

export const ActionButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.5rem;
`
